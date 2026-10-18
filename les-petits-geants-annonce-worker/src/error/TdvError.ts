import { ContentfulStatusCode } from "hono/utils/http-status";

export class TdvError extends Error {
    constructor(
        message: string,
        public readonly status: ContentfulStatusCode
     ) {
        super(message);
        this.name = new.target.name;
     }
}