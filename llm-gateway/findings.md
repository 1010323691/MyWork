# 发现与决策

## 需求
- 仅在 `prod` 环境输出文件日志。
- 日志根目录为 `/var/log/llm-gateway/`。
- 自动创建年/月目录，按天生成日志文件。
- 应用日志文件名格式为 `yyyyMMdd_app.log`。
- 错误日志文件名格式为 `yyyyMMdd_error.log`。
- 日志需要更易读。

## 研究发现
- 当前项目没有 `logback-spring.xml`，日志主要依赖 `application.yml` / `application-dev.yml` / `application-prod.yml` 中的 `logging.level`。
- Spring Boot 版本为 `3.4.1`，默认带 Logback，可直接接入 `logback-spring.xml`。
- 工作区已有未提交改动：`pom.xml`、`src/main/resources/application.yml`。
- `application-prod.yml` 目前只配置日志级别，没有文件输出配置。

## 技术决策
| 决策 | 理由 |
|------|------|
| 新增 `src/main/resources/logback-spring.xml` | 可以按 profile 精准切换 appender，最适合此类需求 |
| 应用日志保留全量级别但不展开异常堆栈 | 提升日常排查时的可读性 |
| 错误日志按 `ERROR` 阈值单独输出并保留完整堆栈 | 专门承载异常信息，满足专门错误日志需求 |

## 资源
- `src/main/resources/application.yml`
- `src/main/resources/application-dev.yml`
- `src/main/resources/application-prod.yml`
- `ai-context/config.md`

