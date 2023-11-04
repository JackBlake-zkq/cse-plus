# Course Search & Enroll +
Chrome extension for UW Madison students that pulls [Rate My Professors](https://www.ratemyprofessors.com/) and [Madgrades](https://madgrades.com/) info into Course Search &amp; Enroll

## Backend

The backend for this chrome extension is built with Express. It Makes use of the [Madgrades API](https://api.madgrades.com/) directly and the Rate My Professors GraphQL API using [this wrapper](https://github.com/Michigan-Tech-Courses/rate-my-professors).

The backend is built such that it can be deployed anywhere. There is a Dockerfile that builds a minimal image from the Typescript source code. It is currently deployed to Google Cloud Platform [Cloud Run](https://cloud.google.com/run). Cloud Run is serverless and lets you specify min and max instances, which makes it really great for minimizing costs while avoiding the vendor lock-in that any kind of cloud function would cause. There are some predatory billing practices you have to watch out for, though. If you configure your service wrongly, you're billing could be uncapped regardless of your max instances.

## Frontend

The chrome extension itself was made with [Plasmo](https://www.plasmo.com/). It doesn't do a ton at the moment other than allow the use of Typescript, but it will enable slick UI with React or Svelte and ability for growth and expansion to other browsers.
