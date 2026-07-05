# DP Learning Plan

Problems in order of easiest to hardest. One problem per major pattern.

| # | Problem | Pattern | Notes |
|---|---------|---------|-------|
| 1 | Climbing Stairs | Fibonacci / intro | DP in disguise |
| 2 | House Robber | Linear decision | First real "decision at each step" DP |
| 3 | Coin Change | Unbounded knapsack | Classic bottom-up |
| 4 | Longest Increasing Subsequence | Subsequence | O(n²) first, then optimize to O(n log n) with binary search |
| 5 | Word Break | String DP | Intro to 1D string problems |
| 6 | Unique Paths II | Grid DP | With obstacles variant |
| 7 | 0/1 Knapsack | Knapsack | Know this cold |
| 8 | Longest Common Subsequence | 2D string DP | Foundation for Edit Distance |
| 9 | Edit Distance | 2D string DP | Shows up a lot, harder of the string family |
| 10 | Decode Ways | String DP | Looks easy, tricky edge cases |
| 11 | Best Time to Buy/Sell Stock with Cooldown | State machine DP | Harder to model the states |
| 12 | Burst Balloons | Interval DP | Genuinely hard — requires reframing the problem |
| 13 | Word Break II | DP + backtracking | Return all solutions variant |
| 14 | Palindrome Partitioning II | Interval DP | Min cuts, trips people up |
| 15 | Regular Expression Matching | String DP | Hardest common string DP, shows up at Google |

**Stop around #10-11 for most roles.** Only grind #12-15 for Google / Jane Street level hard rounds.

## Major DP Categories (for reference)

- **Knapsack variants** — 0/1, unbounded, subset sum (Amazon)
- **Subsequence** — LCS, LIS, Longest Palindromic Subsequence (Google, Dropbox)
- **String DP** — Edit Distance, Word Break, Regex Matching (Google, Dropbox, LinkedIn)
- **Linear/sequential decision** — House Robber, Climbing Stairs, Jump Game (Meta, Amazon)
- **Interval DP** — Burst Balloons, Palindrome Partitioning (Google, harder rounds)
- **Grid/path DP** — Unique Paths, Min Path Sum (Amazon, Bloomberg)
- **Tree DP** — Max Path Sum, House Robber on Tree (Google, Meta)
- **State machine DP** — Stock series with cooldown/k-transactions (Meta, Amazon)
- **Bitmask DP** — TSP variants, visit all nodes (senior/staff rounds at Google)
