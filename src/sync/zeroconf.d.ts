declare module "react-native-zeroconf" {
  import { EventEmitter } from "events";

  interface Service {
    host: string;
    port: number;
    name: string;
    fullName: string;
    txt: Record<string, string>;
    addresses: string[];
  }

  class Zeroconf extends EventEmitter {
    scan(type?: string, protocol?: string, domain?: string): void;
    stop(): void;
    publishService(
      type: string,
      protocol: string,
      domain: string,
      name: string,
      port: number,
      txt?: Record<string, string>
    ): void;
    unpublishService(name: string): void;
    getServices(): Record<string, Service>;
  }

  export default Zeroconf;
}
