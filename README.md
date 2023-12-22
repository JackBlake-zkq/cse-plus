# Course Search & Enroll +
Chrome extension for UW Madison students that pulls [Rate My Professors](https://www.ratemyprofessors.com/) and [Madgrades](https://madgrades.com/) info into Course Search &amp; Enroll

## Current Implementation

The chrome extension was built with [Plasmo](https://www.plasmo.com/). A content script listens for changes to the DOM with a mutation observer, and sends messages to a service worker using Plasmo's Messaging API. The service worker makes http requests to the [Madgrades API](https://api.madgrades.com/) directly and the Rate My Professors GraphQL API using [this wrapper](https://github.com/Michigan-Tech-Courses/rate-my-professors). The service worker sends data back to the content script, which modifies the DOM accodingly.

Note: the Madgrades API uses a token for authenticating requests. This token IS exposed in the packed chrome extension. The token is read only so there is no security risk.

## Old Implementation

Instead of using a service worker, the chrome extension used to make requests to a backend made with Express. Users can still use this version, though I am trying to phase it out to make this project zero-cost.

It was built such that it could be deployed anywhere. There was a Dockerfile that built a minimal image from the Typescript source code. 

It is currently deployed to Google Cloud Platform [Cloud Run](https://cloud.google.com/run). Cloud Run is serverless and lets you specify min and max instances, which makes it really great for minimizing costs while avoiding the vendor lock-in that any kind of cloud function would cause. There are some predatory billing practices you have to watch out for, though. If you configure your service wrongly, you're billing could be uncapped regardless of your max instances.

Once analytics show that users are not on the version that uses this backend, I will shut it down.

