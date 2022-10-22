import Protocol from 'devtools-protocol';
export declare type PatternGenerator = {
    [key in Protocol.Network.ResourceType | 'All']: (patterns: string | string[]) => Protocol.Fetch.RequestPattern[];
};
export declare const patterns: PatternGenerator;
