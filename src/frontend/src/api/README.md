# api

One thin fetch wrapper module per API resource. Each wrapper attaches `Authorization: Bearer <token>`, serialises request bodies as JSON, and deserialises responses. On a 422 it passes the ProblemDetails `code` up to the calling component (which resolves it to a message via the resource file). On a 401 it clears the token and redirects to /sign-in. The OpenAPI contract is the source of truth.
