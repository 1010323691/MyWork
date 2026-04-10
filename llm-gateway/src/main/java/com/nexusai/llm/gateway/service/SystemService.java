package com.nexusai.llm.gateway.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.GraphicsCard;
import oshi.hardware.HardwareAbstractionLayer;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.Base64;

@Service
public class SystemService {

    private static final Logger logger = LoggerFactory.getLogger(SystemService.class);
    private static final Pattern LINUX_CARD_PATTERN = Pattern.compile("card(\\d+)");

    private final SystemInfo systemInfo = new SystemInfo();
    private final HardwareAbstractionLayer hal = systemInfo.getHardware();
    private volatile long[] previousCpuTicks = hal.getProcessor().getSystemCpuLoadTicks();

    public SystemResourceData getSystemResources() {
        try {
            return SystemResourceData.builder()
                    .cpuUsage(getCpuUsage())
                    .memoryUsage(getMemoryUsage())
                    .gpuDataList(getGpuDataList())
                    .build();
        } catch (Exception e) {
            logger.error("Failed to collect system metrics", e);
            return SystemResourceData.builder()
                    .cpuUsage(0.0)
                    .memoryUsage(0.0)
                    .gpuDataList(Collections.emptyList())
                    .build();
        }
    }

    private synchronized Double getCpuUsage() {
        try {
            CentralProcessor processor = hal.getProcessor();
            long[] currentTicks = processor.getSystemCpuLoadTicks();
            double load = processor.getSystemCpuLoadBetweenTicks(previousCpuTicks) * 100.0;
            previousCpuTicks = currentTicks;

            if (Double.isNaN(load) || Double.isInfinite(load) || load < 0) {
                return null;
            }
            return round1(Math.min(load, 100.0));
        } catch (Exception e) {
            logger.warn("Failed to read CPU usage", e);
            return null;
        }
    }

    private Double getMemoryUsage() {
        try {
            GlobalMemory memory = hal.getMemory();
            long available = memory.getAvailable();
            long total = memory.getTotal();
            if (total <= 0) {
                return null;
            }
            double usage = (double) (total - available) / total * 100.0;
            return round1(usage);
        } catch (Exception e) {
            logger.warn("Failed to read memory usage", e);
            return null;
        }
    }

    private List<GpuData> getGpuDataList() {
        Map<String, GpuData> merged = new LinkedHashMap<>();

        mergeGpuList(merged, getInventoryGpuList());
        mergeGpuList(merged, getNvidiaGpuDataList());

        String os = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        if (os.contains("win")) {
            mergeGpuList(merged, getWindowsGpuDataList());
        } else if (os.contains("linux")) {
            mergeGpuList(merged, getLinuxGpuDataList());
        }

        return merged.values().stream()
                .sorted(Comparator.comparing(gpu -> gpu.getIndex() == null ? Integer.MAX_VALUE : gpu.getIndex()))
                .toList();
    }

    private List<GpuData> getInventoryGpuList() {
        List<GpuData> result = new ArrayList<>();
        try {
            List<GraphicsCard> cards = hal.getGraphicsCards();
            for (int i = 0; i < cards.size(); i++) {
                GraphicsCard card = cards.get(i);
                Long totalMemoryMb = card.getVRam() > 0 ? Math.round(card.getVRam() / 1024.0 / 1024.0) : null;
                result.add(GpuData.builder()
                        .type(normalizeVendor(card.getVendor()))
                        .name(card.getName())
                        .index(i)
                        .totalMemoryMb(totalMemoryMb)
                        .build());
            }
        } catch (Exception e) {
            logger.debug("Failed to enumerate GPU inventory", e);
        }
        return result;
    }

    private List<GpuData> getNvidiaGpuDataList() {
        String command = getNvidiaSmiCommand();
        if (command == null) {
            return Collections.emptyList();
        }

        List<String> lines = runCommand(List.of(
                command,
                "--query-gpu=index,utilization.gpu,memory.used,memory.total,name",
                "--format=csv,noheader,nounits"
        ), 5);

        List<GpuData> result = new ArrayList<>();
        for (String line : lines) {
            GpuData gpu = parseNvidiaLine(line);
            if (gpu != null) {
                result.add(gpu);
            }
        }
        return result;
    }

    private GpuData parseNvidiaLine(String line) {
        String[] parts = line.split(",", 5);
        if (parts.length < 5) {
            return null;
        }

        Integer index = parseInteger(parts[0]);
        Double utilization = parseDouble(parts[1]);
        Long usedMemoryMb = parseLong(parts[2]);
        Long totalMemoryMb = parseLong(parts[3]);
        String name = parts[4].trim().replace("\"", "");

        if (index == null) {
            return null;
        }

        return GpuData.builder()
                .type("NVIDIA")
                .name(name)
                .index(index)
                .utilization(utilization == null ? null : round1(utilization))
                .usedMemoryMb(usedMemoryMb)
                .totalMemoryMb(totalMemoryMb)
                .build();
    }

    private List<GpuData> getWindowsGpuDataList() {
        String script = String.join("\n",
                "$ErrorActionPreference = 'SilentlyContinue'",
                "$engine = @{}",
                "$dedicatedUsage = @{}",
                "$sharedUsage = @{}",
                "$dedicatedLimit = @{}",
                "$sharedLimit = @{}",
                "function Get-LuidKey([string]$name) {",
                "  if ($name -match '(luid_0x[0-9a-fA-F]+_0x[0-9a-fA-F]+)') { return $matches[1].ToLower() }",
                "  return $null",
                "}",
                "$samples = (Get-Counter '\\GPU Engine(*)\\Utilization Percentage').CounterSamples",
                "foreach ($sample in $samples) {",
                "  $key = Get-LuidKey $sample.InstanceName",
                "  if ($key) {",
                "    $value = [double]$sample.CookedValue",
                "    if (-not $engine.ContainsKey($key) -or $value -gt $engine[$key]) { $engine[$key] = $value }",
                "  }",
                "}",
                "$memSamples = (Get-Counter '\\GPU Adapter Memory(*)\\Dedicated Usage').CounterSamples",
                "foreach ($sample in $memSamples) {",
                "  $key = Get-LuidKey $sample.InstanceName",
                "  if ($key) {",
                "    if (-not $dedicatedUsage.ContainsKey($key)) { $dedicatedUsage[$key] = 0.0 }",
                "    $dedicatedUsage[$key] += [double]$sample.CookedValue",
                "  }",
                "}",
                "$sharedSamples = (Get-Counter '\\GPU Adapter Memory(*)\\Shared Usage').CounterSamples",
                "foreach ($sample in $sharedSamples) {",
                "  $key = Get-LuidKey $sample.InstanceName",
                "  if ($key) {",
                "    if (-not $sharedUsage.ContainsKey($key)) { $sharedUsage[$key] = 0.0 }",
                "    $sharedUsage[$key] += [double]$sample.CookedValue",
                "  }",
                "}",
                "$dedicatedLimitSamples = (Get-Counter '\\GPU Adapter Memory(*)\\Dedicated Limit').CounterSamples",
                "foreach ($sample in $dedicatedLimitSamples) {",
                "  $key = Get-LuidKey $sample.InstanceName",
                "  if ($key) {",
                "    if (-not $dedicatedLimit.ContainsKey($key)) { $dedicatedLimit[$key] = 0.0 }",
                "    $dedicatedLimit[$key] += [double]$sample.CookedValue",
                "  }",
                "}",
                "$sharedLimitSamples = (Get-Counter '\\GPU Adapter Memory(*)\\Shared Limit').CounterSamples",
                "foreach ($sample in $sharedLimitSamples) {",
                "  $key = Get-LuidKey $sample.InstanceName",
                "  if ($key) {",
                "    if (-not $sharedLimit.ContainsKey($key)) { $sharedLimit[$key] = 0.0 }",
                "    $sharedLimit[$key] += [double]$sample.CookedValue",
                "  }",
                "}",
                "$adapters = @()",
                "$allKeys = @($engine.Keys + $dedicatedUsage.Keys + $sharedUsage.Keys + $dedicatedLimit.Keys + $sharedLimit.Keys | Select-Object -Unique)",
                "foreach ($key in $allKeys) {",
                "  $adapters += [pscustomobject]@{",
                "    Key = $key;",
                "    Engine = if ($engine.ContainsKey($key)) { [double]$engine[$key] } else { 0.0 };",
                "    DedicatedUsage = if ($dedicatedUsage.ContainsKey($key)) { [double]$dedicatedUsage[$key] } else { 0.0 };",
                "    SharedUsage = if ($sharedUsage.ContainsKey($key)) { [double]$sharedUsage[$key] } else { 0.0 };",
                "    DedicatedLimit = if ($dedicatedLimit.ContainsKey($key)) { [double]$dedicatedLimit[$key] } else { 0.0 };",
                "    SharedLimit = if ($sharedLimit.ContainsKey($key)) { [double]$sharedLimit[$key] } else { 0.0 }",
                "  }",
                "}",
                "$cards = @(Get-CimInstance Win32_VideoController)",
                "$realCards = @()",
                "foreach ($card in $cards) {",
                "  if ($card.Name -match 'Virtual|Basic Display|Remote Display|Meta Virtual') { continue }",
                "  $realCards += $card",
                "}",
                "$systemMemoryMb = 0",
                "try {",
                "  $systemInfo = Get-CimInstance Win32_ComputerSystem",
                "  if ($systemInfo.TotalPhysicalMemory) { $systemMemoryMb = [int64][math]::Round([double]$systemInfo.TotalPhysicalMemory / 1MB) }",
                "} catch {}",
                "$availableAdapters = @($adapters)",
                "for ($i = 0; $i -lt $realCards.Count; $i++) {",
                "  $card = $realCards[$i]",
                "  $vendor = ''",
                "  if ($card.Name -match 'NVIDIA') { $vendor = 'NVIDIA' }",
                "  elseif ($card.Name -match 'AMD|Radeon') { $vendor = 'AMD' }",
                "  elseif ($card.Name -match 'Intel') { $vendor = 'Intel' }",
                "  $selected = $null",
                "  if ($vendor -eq 'Intel') {",
                "    $selected = $availableAdapters | Sort-Object @{Expression='SharedUsage';Descending=$true}, @{Expression='Engine';Descending=$true} | Select-Object -First 1",
                "  } elseif ($vendor -eq 'NVIDIA' -or $vendor -eq 'AMD') {",
                "    $selected = $availableAdapters | Sort-Object @{Expression='DedicatedUsage';Descending=$true}, @{Expression='Engine';Descending=$true} | Select-Object -First 1",
                "  } else {",
                "    $selected = $availableAdapters | Sort-Object @{Expression={ $_.DedicatedUsage + $_.SharedUsage + $_.Engine };Descending=$true} | Select-Object -First 1",
                "  }",
                "  $availableAdapters = @($availableAdapters | Where-Object { $_.Key -ne $selected.Key })",
                "  $adapterRamMb = if ($card.AdapterRAM) { [int64][math]::Round([double]$card.AdapterRAM / 1MB) } else { 0 }",
                "  $usedBytes = 0.0",
                "  $limitBytes = 0.0",
                "  $util = ''",
                "  if ($selected) {",
                "    $usedBytes = [double]$selected.DedicatedUsage + [double]$selected.SharedUsage",
                "    $limitBytes = [double]$selected.DedicatedLimit + [double]$selected.SharedLimit",
                "    if ($selected.Engine -gt 0) { $util = [math]::Round([math]::Min([double]$selected.Engine, 100.0), 1) }",
                "  }",
                "  $usedMb = [int64][math]::Round($usedBytes / 1MB)",
                "  $totalMb = if ($limitBytes -gt 0) { [int64][math]::Round($limitBytes / 1MB) } else { $adapterRamMb }",
                "  if ($vendor -eq 'Intel' -and $totalMb -le 0 -and $systemMemoryMb -gt 0) { $totalMb = [int64][math]::Round($systemMemoryMb / 2.0) }",
                "  if ($vendor -eq 'Intel' -and $totalMb -gt 0 -and $usedMb -gt $totalMb) { $usedMb = [int64][math]::Min($usedMb, $totalMb) }",
                "  if ($vendor -ne 'Intel' -and $usedMb -gt $totalMb -and $totalMb -gt 0) { $usedMb = $totalMb }",
                "  Write-Output(\"$i`t$vendor`t$($card.Name)`t$totalMb`t$usedMb`t$util\")",
                "}");

        List<String> lines = runPowerShell(script, 20);
        List<GpuData> result = new ArrayList<>();

        for (String line : lines) {
            String[] parts = line.split("\t", 6);
            if (parts.length < 6) {
                continue;
            }
            Integer index = parseInteger(parts[0]);
            if (index == null) {
                continue;
            }
            result.add(GpuData.builder()
                    .index(index)
                    .type(parts[1].isBlank() ? null : parts[1].trim())
                    .name(parts[2].trim())
                    .totalMemoryMb(parseLong(parts[3]))
                    .usedMemoryMb(parseLong(parts[4]))
                    .utilization(parts[5].isBlank() ? null : parseDouble(parts[5]))
                    .build());
        }

        return result;
    }

    private List<GpuData> getLinuxGpuDataList() {
        Path drmPath = Path.of("/sys/class/drm");
        if (!Files.isDirectory(drmPath)) {
            return Collections.emptyList();
        }

        List<GpuData> result = new ArrayList<>();
        try {
            Files.list(drmPath)
                    .filter(path -> Files.isDirectory(path) && LINUX_CARD_PATTERN.matcher(path.getFileName().toString()).matches())
                    .sorted()
                    .forEach(cardPath -> {
                        GpuData gpu = readLinuxDrmCard(cardPath);
                        if (gpu != null) {
                            result.add(gpu);
                        }
                    });
        } catch (IOException e) {
            logger.debug("Failed to read Linux DRM GPU metrics", e);
        }
        return result;
    }

    private GpuData readLinuxDrmCard(Path cardPath) {
        Matcher matcher = LINUX_CARD_PATTERN.matcher(cardPath.getFileName().toString());
        if (!matcher.matches()) {
            return null;
        }

        Integer index = parseInteger(matcher.group(1));
        Path devicePath = cardPath.resolve("device");

        String vendor = mapLinuxVendor(readText(devicePath.resolve("vendor")));
        String name = readLinuxGpuName(devicePath);
        Long totalMemoryMb = readBytesAsMb(devicePath.resolve("mem_info_vram_total"));
        Long usedMemoryMb = readBytesAsMb(devicePath.resolve("mem_info_vram_used"));
        Double utilization = readPercent(devicePath.resolve("gpu_busy_percent"));

        if (name == null && vendor == null && utilization == null && totalMemoryMb == null && usedMemoryMb == null) {
            return null;
        }

        return GpuData.builder()
                .index(index)
                .type(vendor)
                .name(name != null ? name : "GPU " + index)
                .utilization(utilization)
                .usedMemoryMb(usedMemoryMb)
                .totalMemoryMb(totalMemoryMb)
                .build();
    }

    private String readLinuxGpuName(Path devicePath) {
        String productName = readText(devicePath.resolve("product_name"));
        if (productName != null && !productName.isBlank()) {
            return productName;
        }

        Path ueventPath = devicePath.resolve("uevent");
        if (!Files.isRegularFile(ueventPath)) {
            return null;
        }

        try {
            for (String line : Files.readAllLines(ueventPath, StandardCharsets.UTF_8)) {
                if (line.startsWith("DRIVER=")) {
                    return line.substring("DRIVER=".length());
                }
            }
        } catch (IOException e) {
            logger.debug("Failed to read GPU uevent {}", ueventPath, e);
        }
        return null;
    }

    private void mergeGpuList(Map<String, GpuData> merged, List<GpuData> incoming) {
        for (GpuData gpu : incoming) {
            if (gpu == null) {
                continue;
            }
            String key = buildGpuKey(gpu);
            if (!merged.containsKey(key)) {
                merged.put(key, gpu);
                continue;
            }
            merged.put(key, mergeGpuData(merged.get(key), gpu));
        }
    }

    private GpuData mergeGpuData(GpuData base, GpuData incoming) {
        return GpuData.builder()
                .type(firstNonBlank(base.getType(), incoming.getType()))
                .name(firstNonBlank(base.getName(), incoming.getName()))
                .index(base.getIndex() != null ? base.getIndex() : incoming.getIndex())
                .utilization(preferMetric(base.getUtilization(), incoming.getUtilization()))
                .usedMemoryMb(preferMetric(base.getUsedMemoryMb(), incoming.getUsedMemoryMb()))
                .totalMemoryMb(preferLargerMetric(base.getTotalMemoryMb(), incoming.getTotalMemoryMb()))
                .build();
    }

    private <T extends Number> T preferMetric(T current, T incoming) {
        if (incoming != null && incoming.doubleValue() > 0) {
            return incoming;
        }
        return current != null ? current : incoming;
    }

    private <T extends Number> T preferLargerMetric(T current, T incoming) {
        if (current == null) {
            return incoming;
        }
        if (incoming == null) {
            return current;
        }
        return incoming.doubleValue() > current.doubleValue() ? incoming : current;
    }

    private String buildGpuKey(GpuData gpu) {
        String normalizedName = normalizeName(gpu.getName());
        String normalizedType = normalizeName(gpu.getType());
        if (!normalizedName.isBlank()) {
            return normalizedType + ":" + normalizedName;
        }
        return normalizedType + ":index:" + Objects.toString(gpu.getIndex(), "unknown");
    }

    private String normalizeName(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }

    private String normalizeVendor(String vendor) {
        if (vendor == null) {
            return null;
        }
        String lower = vendor.toLowerCase(Locale.ROOT);
        if (lower.contains("nvidia")) {
            return "NVIDIA";
        }
        if (lower.contains("amd") || lower.contains("advanced micro devices") || lower.contains("radeon")) {
            return "AMD";
        }
        if (lower.contains("intel")) {
            return "Intel";
        }
        return vendor;
    }

    private String mapLinuxVendor(String rawVendor) {
        if (rawVendor == null) {
            return null;
        }
        String value = rawVendor.trim().toLowerCase(Locale.ROOT);
        return switch (value) {
            case "0x10de" -> "NVIDIA";
            case "0x1002", "0x1022" -> "AMD";
            case "0x8086" -> "Intel";
            default -> rawVendor;
        };
    }

    private String getNvidiaSmiCommand() {
        String osName = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);

        if (osName.contains("win")) {
            String[] possiblePaths = {
                    "C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v12.0\\bin\\nvidia-smi.exe",
                    "C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v11.8\\bin\\nvidia-smi.exe",
                    "C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe"
            };

            for (String path : possiblePaths) {
                if (new File(path).exists()) {
                    return path;
                }
            }

            if (isCommandAvailable(List.of("nvidia-smi.exe", "--version"), 2)) {
                return "nvidia-smi.exe";
            }
        } else if (osName.contains("linux")) {
            if (isCommandAvailable(List.of("nvidia-smi", "--version"), 2)) {
                return "nvidia-smi";
            }
        }

        return null;
    }

    private boolean isCommandAvailable(List<String> command, int timeoutSeconds) {
        try {
            Process process = new ProcessBuilder(command).start();
            return process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            return false;
        }
    }

    private List<String> runPowerShell(String script, int timeoutSeconds) {
        String encoded = Base64.getEncoder().encodeToString(script.getBytes(StandardCharsets.UTF_16LE));
        return runCommand(List.of(
                getPowerShellCommand(),
                "-NoProfile",
                "-ExecutionPolicy", "Bypass",
                "-EncodedCommand", encoded
        ), timeoutSeconds);
    }

    private String getPowerShellCommand() {
        String systemRoot = System.getenv("SystemRoot");
        if (systemRoot != null && !systemRoot.isBlank()) {
            String absolutePath = systemRoot + "\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
            if (new File(absolutePath).exists()) {
                return absolutePath;
            }
        }
        return "powershell.exe";
    }

    private List<String> runCommand(List<String> command, int timeoutSeconds) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(command);
            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();
            List<String> lines = new ArrayList<>();

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String trimmed = line.trim();
                    if (!trimmed.isEmpty()) {
                        lines.add(trimmed);
                    }
                }
            }

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return Collections.emptyList();
            }
            return lines;
        } catch (Exception e) {
            logger.debug("Command execution failed: {}", String.join(" ", command), e);
            return Collections.emptyList();
        }
    }

    private String readText(Path path) {
        try {
            if (!Files.isRegularFile(path)) {
                return null;
            }
            return Files.readString(path, StandardCharsets.UTF_8).trim();
        } catch (IOException e) {
            return null;
        }
    }

    private Long readBytesAsMb(Path path) {
        String text = readText(path);
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            return Math.round(Double.parseDouble(text) / 1024.0 / 1024.0);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Double readPercent(Path path) {
        String text = readText(path);
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            return round1(Double.parseDouble(text));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer parseInteger(String value) {
        try {
            return Integer.parseInt(cleanNumber(value));
        } catch (Exception e) {
            return null;
        }
    }

    private Long parseLong(String value) {
        try {
            return Long.parseLong(cleanNumber(value));
        } catch (Exception e) {
            return null;
        }
    }

    private Double parseDouble(String value) {
        try {
            return Double.parseDouble(cleanNumber(value));
        } catch (Exception e) {
            return null;
        }
    }

    private String cleanNumber(String value) {
        return value == null ? "" : value.trim().replace("%", "");
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        return (second != null && !second.isBlank()) ? second : null;
    }

    private Double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class SystemResourceData {
        private Double cpuUsage;
        private Double memoryUsage;
        private List<GpuData> gpuDataList;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class GpuData {
        private String type;
        private String name;
        private Integer index;
        private Double utilization;
        private Long usedMemoryMb;
        private Long totalMemoryMb;

        public Double getMemoryUsagePercent() {
            if (totalMemoryMb == null || totalMemoryMb <= 0 || usedMemoryMb == null) {
                return null;
            }
            return Math.round((double) usedMemoryMb / totalMemoryMb * 1000.0) / 10.0;
        }
    }
}
