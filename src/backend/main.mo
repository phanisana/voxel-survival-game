import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Order "mo:core/Order";

actor {
  type Score = {
    kills : Nat;
    survivalTime : Nat;
  };

  type LeaderboardEntry = {
    principal : Text;
    kills : Nat;
    survivalTime : Nat;
  };

  module LeaderboardEntry {
    public func compare(entry1 : LeaderboardEntry, entry2 : LeaderboardEntry) : Order.Order {
      switch (Nat.compare(entry2.kills, entry1.kills)) {
        case (#equal) { Nat.compare(entry2.survivalTime, entry1.survivalTime) };
        case (order) { order };
      };
    };
  };

  let leaderboard = Map.empty<Principal, Score>();

  public shared ({ caller }) func saveScore(kills : Nat, survivalTime : Nat) : async () {
    if (kills == 0) { Runtime.trap("Cannot object with zero kills") };
    let newScore : Score = { kills; survivalTime };
    switch (leaderboard.get(caller)) {
      case (null) {
        leaderboard.add(caller, newScore);
      };
      case (?existingScore) {
        if (kills > existingScore.kills or (kills == existingScore.kills and survivalTime > existingScore.survivalTime)) {
          leaderboard.add(caller, newScore);
        };
      };
    };
  };

  public query ({ caller }) func getTopLeaderboardEntries() : async [LeaderboardEntry] {
    let entries : List.List<LeaderboardEntry> = List.empty();
    for ((principal, score) in leaderboard.entries()) {
      let entry : LeaderboardEntry = {
        principal = principal.toText();
        kills = score.kills;
        survivalTime = score.survivalTime;
      };
      entries.add(entry);
    };

    var result : [LeaderboardEntry] = entries
      .sort()
      .range(0, Nat.min(entries.size(), 10))
      .toArray();
    result;
  };

  public query ({ caller }) func getPlayerScore() : async ?Score {
    leaderboard.get(caller);
  };
};
