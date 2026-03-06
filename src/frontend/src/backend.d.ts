import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface LeaderboardEntry {
    principal: string;
    survivalTime: bigint;
    kills: bigint;
}
export interface Score {
    survivalTime: bigint;
    kills: bigint;
}
export interface backendInterface {
    getPlayerScore(): Promise<Score | null>;
    getTopLeaderboardEntries(): Promise<Array<LeaderboardEntry>>;
    saveScore(kills: bigint, survivalTime: bigint): Promise<void>;
}
