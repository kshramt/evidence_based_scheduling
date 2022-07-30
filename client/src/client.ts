import * as generated_client from "./generated_client"


export const client = new generated_client.DefaultApi(
  // new Client.Configuration({ basePath: "http://127.0.0.1:5002" }),
  new generated_client.Configuration({ basePath: window.location.origin }),
);
