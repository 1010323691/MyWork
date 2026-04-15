export namespace auth {
	
	export class UserInfo {
	    id: string;
	    name: string;
	    email: string;
	    expire_at: number;
	
	    static createFrom(source: any = {}) {
	        return new UserInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.email = source["email"];
	        this.expire_at = source["expire_at"];
	    }
	}

}

export namespace config {
	
	export class Proxy {
	    name: string;
	    type: string;
	    local_port: number;
	    remote_port?: number;
	    local_addr?: string;
	    custom_domains?: string[];
	    subdomain?: string;
	    routes?: string;
	
	    static createFrom(source: any = {}) {
	        return new Proxy(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.type = source["type"];
	        this.local_port = source["local_port"];
	        this.remote_port = source["remote_port"];
	        this.local_addr = source["local_addr"];
	        this.custom_domains = source["custom_domains"];
	        this.subdomain = source["subdomain"];
	        this.routes = source["routes"];
	    }
	}
	export class NexusConfig {
	    server_addr: string;
	    server_port: number;
	    auth_type?: string;
	    auth_token?: string;
	    proxy_protocols?: string;
	    proxies: Proxy[];
	    tls_enable?: boolean;
	    tls_verify?: boolean;
	    connect_retry?: number;
	    enable_compression?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new NexusConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.server_addr = source["server_addr"];
	        this.server_port = source["server_port"];
	        this.auth_type = source["auth_type"];
	        this.auth_token = source["auth_token"];
	        this.proxy_protocols = source["proxy_protocols"];
	        this.proxies = this.convertValues(source["proxies"], Proxy);
	        this.tls_enable = source["tls_enable"];
	        this.tls_verify = source["tls_verify"];
	        this.connect_retry = source["connect_retry"];
	        this.enable_compression = source["enable_compression"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace service {
	
	export class LogEntry {
	    // Go type: time
	    time: any;
	    level: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new LogEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.time = this.convertValues(source["time"], null);
	        this.level = source["level"];
	        this.message = source["message"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ProxyStatus {
	    name: string;
	    type: string;
	    local_port: number;
	    remote_port: number;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new ProxyStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.type = source["type"];
	        this.local_port = source["local_port"];
	        this.remote_port = source["remote_port"];
	        this.status = source["status"];
	    }
	}

}

export namespace storage {
	
	export class Settings {
	    auto_start: boolean;
	    min_to_tray: boolean;
	    theme: string;
	    language: string;
	    last_window_size: number[];
	    last_window_pos: number[];
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.auto_start = source["auto_start"];
	        this.min_to_tray = source["min_to_tray"];
	        this.theme = source["theme"];
	        this.language = source["language"];
	        this.last_window_size = source["last_window_size"];
	        this.last_window_pos = source["last_window_pos"];
	    }
	}

}

