# Course Search & Enroll +
Chrome extension for UW Madison students that pulls [Rate My Professors](https://www.ratemyprofessors.com/) and [Madgrades](https://madgrades.com/) info into Course Search &amp; Enroll

## Backend

The backend for this chrome extension is built with Express. It Makes use of the [Madgrades API](https://api.madgrades.com/) directly and the Rate My Professors GraphQL API using [this wrapper](https://github.com/Michigan-Tech-Courses/rate-my-professors). This was chosen over a service worker to keep credentials secret and for fastest MVP (since I'm unexperienced with service workers).

The backend is Deployed to Google Cloud Platform [Cloud Run](https://cloud.google.com/run). This allows for Easy CI/CD without even needing a Dockerfile (though one can be used for more complex projects). It is serverless, and lets you specify min and max instances, which makes it really great for minimizing costs (can be near 0) while avoiding the vendor lock-in that any kind of cloud function would cause.

## Frontend

The chrome extension itself was made with [Plasmo](https://www.plasmo.com/). It doens't do a ton at the moment other than allow the use of Typescript, but it will enable slick UI with React or Svelte and ability for growth and expansion to other browsers. It also allows for continuous intgration and submission for review to the chrome store through GitHub actions, which may also be useful to implement in the future.
