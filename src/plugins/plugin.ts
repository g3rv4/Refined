export default class Plugin {
    protected settings;

    public constructor(settings: any) {
        this.settings = settings;
    }

    public init(wsPlugins: Plugin[], xhrPlugins: Plugin[]): void {};
    public processWebSocketData(data: any) { return data; }
    public interceptXHR(request, method, path, async) { };
}