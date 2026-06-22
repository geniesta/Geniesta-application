import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { reactRepo, jwtGoRepo, searchResponse } from "./fixtures";
import type { Repo } from "@/lib/server/github";

const REPOS: Record<string, Repo> = {
  "facebook/react": reactRepo,
  "dgrijalva/jwt-go": jwtGoRepo,
};

export const handlers = [
  http.get("https://api.github.com/search/repositories", () =>
    HttpResponse.json(searchResponse),
  ),
  http.get("https://api.github.com/repos/:owner/:repo", ({ params }) => {
    const key = `${params.owner}/${params.repo}`;
    const repo = REPOS[key];
    if (!repo) {
      return HttpResponse.json({ message: "Not Found" }, { status: 404 });
    }
    return HttpResponse.json(repo);
  }),
];

export const server = setupServer(...handlers);
