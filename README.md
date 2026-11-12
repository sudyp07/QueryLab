# QueryLab

**Explore. Query. Understand.**

QueryLab is an open-source, browser-based database learning and experimentation workspace built with React, TypeScript, Vite and a local SQLite WebAssembly engine. It combines an actual relational database with a separately labeled MongoDB-style **simulation** based on Mingo. All data operations take place in the browser, with workspace persistence in IndexedDB.

QueryLab is intended for university database coursework, SQL practice, teaching and local experimentation. It does not require an account, API key, database server or subscription.

**Project URL after your own GitHub Pages deployment:** `https://sudyp07.github.io/QueryLab/`

> Deployment and offline behavior depend on completing the build and browser checks described below. A source ZIP is not itself a deployed application.

## What is implemented

| Area | Implementation |
| --- | --- |
| SQL editor | CodeMirror 6 with syntax highlighting, schema-aware suggestions, line numbers, search, code folding, selected-text execution, formatting, multiple tabs and keyboard commands |
| SQL execution | Real SQLite queries running inside a Web Worker via sql.js and WebAssembly; supports SQLite DDL, DML, joins, grouping, transactions, indexes, views and triggers according to SQLite's capabilities |
| SQL results | Result grid, JSON tree and raw views, returned rows, SQLite affected rows, browser execution duration, meaningful errors, CSV or JSON exports |
| NoSQL laboratory | Local Mingo-powered JSON document queries with supported CRUD, filtering, projections, sorting and aggregation stages; no MongoDB server is involved |
| Browser persistence | IndexedDB databases, saved queries, query history, editor sessions and learning progress |
| Database explorer | Actual tables, fields, primary and foreign keys, indexes, row counts, collections and document counts |
| Schema designer | Relational ER diagram from SQLite's actual schema, draggable objects, visual table creation, columns, foreign key references, renaming and deletion |
| Document schema inspection | Inferred collection fields and field types from local documents |
| Imports | `.sql`, `.sqlite`, `.db`, `.csv`, `.json`; errors are surfaced |
| Exports | `.sqlite` database bytes, `.sql` SQL dump with rows, query result CSV, document collections JSON and a workspace JSON backup |
| Sample data | University, E-commerce, Library and fictional Hospital SQL databases; Campus and Commerce document examples |
| Learning | 15 SQL lessons, 12 document database lessons, sample queries and seven result-validated challenges |
| Productivity | Command palette, recent queries, saved queries, light/dark themes, panel toggles, keyboard shortcuts, adjustable editor/results split |
| Privacy | Local execution, no user accounts, analytics, telemetry or external database calls |
| Deployment | GitHub Pages base path and a GitHub Actions workflow running install, type checks, tests and build |
| Offline caching | PWA service worker configuration caches built JS, CSS, SQLite WASM and app assets after a successful online visit |

## Source tree

```text
QueryLab/
├── .github/workflows/deploy.yml     # GitHub Pages CI
├── public/                         # Local icons and copied SQLite WASM
├── scripts/copy-wasm.mjs           # Copies packaged WASM into /public
├── src/
│   ├── components/                 # Code editor, explorer, result viewer, dialogs, designer, ER diagram
│   ├── data/                       # Sample databases and learning content
│   ├── engines/                    # SQL worker client and document query layer
│   ├── lib/                        # CSV, SQL quoting, backup helpers
│   ├── storage/                    # IndexedDB persistence
│   ├── styles/                     # Unified light/dark interface styles
│   ├── tests/                      # Vitest engine and storage tests
│   ├── workers/                    # SQLite WASM Web Worker
│   ├── App.tsx                      # Workspace coordinator and view routing
│   └── main.tsx                     # React bootstrapping and service worker registration
├── index.html
├── package.json
├── tsconfig*.json
└── vite.config.ts
```

## Requirements

- Node.js **22 or newer** for local development/building.
- npm for installing the JavaScript development dependencies.
- A current browser with IndexedDB, WebAssembly, module workers and service workers.

No Node.js runtime is used by the published website. The static build runs in the browser.

## Install and run locally

```bash
npm install
npm run dev
```

Open the localhost URL shown by Vite. In the initial workspace, the University sample uses a real SQL database and Campus contains real local JSON sample documents.

**Production checks:**

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` copies `node_modules/sql.js/dist/sql-wasm.wasm` to `public/sql-wasm.wasm` and outputs the deployable static site to `dist/`.

## Deploy to GitHub Pages

1. Create a **public repository** named `QueryLab` at `github.com/sudyp07/QueryLab`.
2. Extract this source ZIP, then put the **contents** of the `QueryLab` folder in that repository's root.
3. Push all source files. Do not upload `node_modules` or `dist` to Git.
4. Under **Settings > Pages > Build and deployment**, select **GitHub Actions** as the source.
5. The provided `.github/workflows/deploy.yml` installs dependencies, performs the TypeScript check, runs Vitest, builds the static files, verifies the Vite output and uploads **only `dist`** to Pages.
6. When the workflow succeeds and GitHub reports a URL, open `https://sudyp07.github.io/QueryLab/`.

**White screen after publishing?** Open Settings > Pages, make sure Source is GitHub Actions, then inspect the `Build, test and deploy QueryLab` run in Actions. The custom `build` job and its `deploy` job must both succeed. The default `pages-build-deployment` job is not a substitute: that workflow can deploy raw source files. Verify that the published page's HTML references `/QueryLab/assets/` JavaScript bundles, rather than `/src/main.tsx`. After a successful redeploy, refresh with Ctrl+Shift+R. If a previous version had installed a service worker, a stale cache can survive; use your browser's Application > Service Workers > Unregister, then reload. Do not clear the entire site's storage unless you have exported your databases first.

The Vite config uses `base: '/QueryLab/'`. The service worker manifest also uses this project path. If you rename the repository, update `vite.config.ts` and the README's project URL accordingly.

**First deployment checklist:**

- Load the published site directly and refresh it.
- In the SQL editor, run `SELECT COUNT(*) FROM students;` and confirm the engine returns an actual number.
- Create a temporary table, refresh the page, and verify the table is still present.
- Open the document workspace and run a `find` or aggregation command.
- Export the SQLite database and download a workspace backup.
- Verify in the browser's Network panel that SQLite WASM is served from `/QueryLab/sql-wasm.wasm` and that scripts, CSS and worker assets return success responses.
- Reopen the app offline after an initial successful load and service worker installation. Check the browser console and a sample query. An offline test has to be performed on the deployed site before considering offline behavior verified.

No GitHub account or repository access is required by QueryLab. The Actions workflow uses the default GitHub Pages permissions and does not require repository secrets.

## How the local architecture works

```text
                 Browser (static GitHub Pages site)
    +---------------------------------------------------+
    |  React workspace and CodeMirror editor            |
    |        |                      |                   |
    |        v                      v                   |
    |    SQL worker client      Document engine          |
    |        |                      |                   |
    |        v                      v                   |
    |    Web Worker             Mingo in memory          |
    |        |                      |                   |
    |    sql.js SQLite WASM     JSON collections         |
    |        |                      |                   |
    |        +----------+-----------+                   |
    |                   |                               |
    |              IndexedDB                            |
    |       databases / history / queries / preferences  |
    +---------------------------------------------------+
```

**SQLite** is a real embedded relational database engine that supports SQL statements, tables, keys, joins, indexes, views, triggers and transactions. **WebAssembly** is a portable binary format that lets SQLite run inside the browser. **sql.js** makes SQLite usable from JavaScript and can serialize the database to a byte array. QueryLab runs SQL inside a Web Worker to avoid blocking the UI during normal execution.

**MongoDB** is a separate database server product and is *not included here*. **Mingo** implements a useful subset of MongoDB-style query semantics for JavaScript objects in the browser. It does not emulate MongoDB's network server, real query planner, BSON storage, transactions, indexes, security settings, replication or sharding. QueryLab uses it explicitly as an educational document database simulator.

**IndexedDB** is the browser's persistent local storage. QueryLab saves SQLite byte snapshots and document collections there. Different browsers and devices have separate databases. Clearing site data can permanently delete your QueryLab workspace. Export backups regularly.

## NoSQL JSON command syntax

Queries run against the selected local document database. Commands are JSON objects, not JavaScript expressions.

```json
{
  "collection": "students",
  "operation": "find",
  "filter": { "gpa": { "$gte": 3.7 } },
  "sort": { "gpa": -1 },
  "limit": 10
}
```

```json
{
  "collection": "students",
  "operation": "aggregate",
  "pipeline": [
    { "$group": { "_id": "$department", "total": { "$sum": 1 } } },
    { "$sort": { "total": -1 } }
  ]
}
```

**Supported operations:** `createCollection`, `insertOne`, `insertMany`, `find`, `findOne`, `updateOne`, `updateMany`, `replaceOne`, `deleteOne`, `deleteMany`, `aggregate`.

**Supported filter operators** are those provided by Mingo for the selected expressions, including `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$and`, `$or`, `$not`, `$exists`, `$regex` and `$elemMatch`.

**Explicitly implemented update operators:** `$set`, `$unset`, `$inc`, `$push` for a single item, `$pull`, `$addToSet` for a single item, `$rename`. `upsert` is supported for `updateOne`, `updateMany` and `replaceOne`. This implementation does not support every MongoDB modifier option or every MongoDB update expression, including `$each` array modifiers. Update operations are applied to a cloned collection, so the original collection is preserved when an operation throws an error.

**Supported aggregation stages:** `$match`, `$project`, `$group`, `$sort`, `$limit`, `$skip`, `$unwind`, `$count`, `$addFields`. More advanced server-side MongoDB features, including `lookup`, are intentionally not claimed.

**Result timing:** NoSQL durations are measurements of local JavaScript execution, not measurements from a MongoDB deployment. SQLite's EXPLAIN QUERY PLAN is an actual SQLite query plan and does not represent MongoDB behavior. Results depend on browser load, dataset size and device performance.

## Sample datasets

| Relational | Tables |
| --- | --- |
| University | students, courses, instructors, enrollments, departments, assignments, grades |
| E-commerce | customers, products, orders, order_items, payments, categories |
| Library | books, authors, members, loans, reservations |
| Hospital | patients, doctors, appointments, departments, prescriptions |

Hospital records are fictional educational examples and should never be mistaken for medical records. The sample documents include `students`, `courses`, `users`, `comments`, `products` and `orders` across Campus and Commerce.

## Learning and assessment

The learning center contains fundamentals, query writing, joins, indexes, aggregations, document modeling and optimization. Seven interactive challenges open a suitable sample dataset and load an editable starter query.

- SQL challenges execute the proposed solution and the learner's query against a cloned snapshot and compare actual output column names and result rows. Rows can appear in different orders, which avoids rejecting equivalent SQL solely due to output ordering.
- Document challenges run the learner's JSON command and expected command through the simulator and compare actual returned documents.
- Write operations are not accepted as SQL challenge submissions. This helps avoid changing the active student dataset during an assessment.

This is a practical educational validator, not a full semantic theorem prover for SQL or MongoDB queries.

## Import and backup safety

- SQL scripts run with SQLite's actual parser. Import them only from sources you trust.
- CSV headers become SQLite `TEXT` columns; no type inference or spreadsheet formulas are executed. Importing to an existing SQL table name returns SQLite's usual error instead of silently replacing data.
- JSON object arrays become local document collections. Each document receives a local `_id` if missing.
- Workspace backup JSON encodes binary SQLite data as Base64, alongside local JSON documents, saved queries, activity history and completed challenges. Importing a backup adds databases with new IDs and does not delete the current workspace.
- Files above 18 MB are rejected by the import interface. Very large SQL statements or complex document aggregations may be slow, and the browser may impose IndexedDB quotas.

## Editor shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl or Cmd + Enter | Run selection or current editor text |
| Ctrl or Cmd + S | Save query to local library |
| Ctrl or Cmd + Shift + F | Format SQL or JSON |
| Ctrl or Cmd + K | Open command palette |
| Ctrl or Cmd + F | Find in CodeMirror |

The editor supports keyboard navigation, keyboard-accessible menus, high contrast colors and reduced-motion preferences.

## Privacy and security model

QueryLab intentionally provides no login, analytics, advertisements or telemetry. SQLite's WASM file, JavaScript, CSS and font resources are served from the same origin. IndexedDB, Mingo, the database worker, query editor and exports all operate locally. The visible GitHub link is optional navigation and is not used for runtime database access.

This project is not a sandbox for executing untrusted SQL with OS privileges: sql.js runs in a restricted browser Web Worker without backend disk or network database access. The worker's normal ability to use browser APIs is separate from any SQLite extension availability. Browser storage is not encrypted by QueryLab. Do not import sensitive, regulated or production database backups into a shared device.

## Screenshots and testing

The project does not include invented screenshots. Capture actual screenshots of the locally running SQL editor, document editor, schema diagram and light/dark themes after successful testing, then add them to this README as desired.

```bash
npm run typecheck
npm test
npm run build
```

Vitest tests include real SQLite statement execution and errors, FK constraints, joins, transactions, EXPLAIN, SQLite export/import, Mingo filtering, document CRUD and aggregation, CSV quoting, Base64 backup serialization, and fake-indexeddb storage behavior.

Additional manual checks required before claiming full production readiness: Chrome/Firefox/Safari keyboard navigation, mobile layouts and touch scrolling, GitHub Pages deployed-base-path verification, worker loading, and offline installation/reload. These cannot be substituted by unit tests.

## Known limitations

1. No backend and no multi-device synchronization. Browsers can evict local IndexedDB data.
2. Document queries are a supported Mingo subset, not MongoDB itself. No actual MongoDB planner, database indexes, transactions or network services.
3. SQL result grids show the last result set of a multi-statement SQL script. The affected-row count comes from the latest SQLite statement rather than a total across the script.
4. Browser tabs share persisted snapshots but are not coordinated for simultaneous editing. Avoid modifying the same local database from multiple tabs at once.
5. The visual ER designer uses actual foreign keys, but it does not automatically generate all types of many-to-many diagrams or migrate every possible schema change.
6. CSV imports store raw cell strings as TEXT, and use the first row as a header. Inspect imported types before using values in numerical operations.
7. The JSON simulator stores ordinary JavaScript JSON-compatible data and does not implement MongoDB's BSON-specific types or driver syntax.
8. Offline support requires a successful initial load of the service worker and all application assets. Caches may be cleared by the browser.
9. The app was authored for static deployment. Do not treat a successful local Vite development run alone as proof of a successful Pages deployment.

## Contributing

Fork the project, create a focused branch, add tests for behavior changes, run the type check and build, and open a pull request. Keep the code modular and the user interface functional, compact and accessible. Do not add tracking or external database dependencies.

## License

MIT. See `LICENSE`.

---

© 2026 Sudip Nepal
