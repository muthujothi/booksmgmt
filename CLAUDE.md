# Books Management App

## Project Overview
A Spring Boot web app for managing a personal book collection with quotes and reading memories. Vanilla JS frontend, H2 database, no build tools required.

## Tech Stack
- **Backend**: Spring Boot 3.2.5, Java 17, Spring Data JPA, H2 (file-based at `./data/booksdb`)
- **Frontend**: Vanilla HTML/CSS/JS (no framework, no bundler)
- **Static files**: `src/main/resources/static/`

## Commands
- **Build**: `./mvnw compile`
- **Run**: `./mvnw spring-boot:run` (serves on http://localhost:8080)
- **No tests** currently configured

## Project Structure
```
src/main/java/com/booksmgmt/
  model/          # JPA entities: Book, Quote, Memory
  repository/     # Spring Data JPA repositories
  service/        # Business logic layer
  controller/     # REST controllers under /api/books
  config/         # WebConfig (resource handlers, view controllers)

src/main/resources/static/
  index.html      # Home page (book grid)
  book.html       # Book detail page (quotes & memories)
  css/style.css   # Global styles
  css/book-detail.css  # Detail page styles
  js/app.js       # Home page JS
  js/book-detail.js    # Detail page JS
```

## Conventions
- **Package**: `com.booksmgmt`
- **Entities**: Use `@Entity` with explicit `@Table(name=...)`. Use `@JsonIgnore` on `@ManyToOne` back-references to prevent circular serialization.
- **Repositories**: Extend `JpaRepository<Entity, Long>`, annotate with `@Repository`
- **Services**: `@Service` classes with constructor injection
- **Controllers**: `@RestController` with `@RequestMapping("/api/...")`. Book sub-resources nest under `/api/books/{bookId}/...`
- **Frontend routing**: SPA-style pages use `WebConfig.addViewControllers()` to forward paths (e.g. `/book/{id}`) to static HTML files. JS extracts params from `window.location.pathname`.
- **No Lombok** — use plain getters/setters
- **Form data** for Book create/update (supports file upload), **JSON** for Quote/Memory endpoints
- **Image uploads**: Stored in `./uploads/covers/` with UUID filenames. Only JPEG/PNG accepted. External URLs whitelisted to Google Books and OpenLibrary only.

## Key Design Decisions
- H2 with `ddl-auto=update` — tables auto-created from entities
- `@PrePersist` for auto-setting `createdAt` timestamps
- Commit messages: short imperative sentence describing the "why"
