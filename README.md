# Course Search & Enroll +
Browser extension for UW Madison students that pulls [Rate My Professors](https://www.ratemyprofessors.com/) and [Madgrades](https://madgrades.com/) info into Course Search &amp; Enroll

## Links to supported Extension Stores

<a href="https://chrome.google.com/webstore/detail/uw-madison-course-search/ldnllmdimjknflobmdjnmefeollalodf">
<img src="https://github.com/user-attachments/assets/e6f3ff4e-a48a-4cbb-8286-7e21abae9cd7" width="50" height="50"/>
</a>

## Implementation

The chrome extension was built with [Plasmo](https://www.plasmo.com/). A content script listens for changes to the DOM with a mutation observer, and sends messages to a service worker using Plasmo's Messaging API. The service worker makes http requests to the [Madgrades API](https://api.madgrades.com/) directly and the Rate My Professors GraphQL API using [this wrapper](https://github.com/Michigan-Tech-Courses/rate-my-professors). The service worker sends data back to the content script, which modifies the DOM accodingly.

### Pros

- Free
- Fresh Data
- Simple

### Cons

- API Rate Limits
  - If too many users are active at once, could run into these
  - Undocumented, so don't know how many users can be handled
- Requires exposing readonly API key, opens up trivial attack on user experience
- Slow - making API calls as needed means latency each time a users click on a course

See [this issue](https://github.com/JackBlake-zkq/cse-plus/issues/7) with a proposed overhaul, which would eliminate these Cons while keeping this project having zero operating expenses. It would sacrafice some data freshness, though.
