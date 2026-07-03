# Project-specific guidance

## Stack
React 16 + TypeScript 4, Material UI v4, Emotion CSS, Formik, Webpack 4, Yarn 1.x.
Run tests: `yarn test --no-coverage` (requires Node 16 via nvm).

## Plugin registration
New plugins live in `src/plugins/<name>/`. Register in `src/Root.tsx` by importing
and calling the default export from `src/plugins/<name>/index.ts`, which calls
`registerPlugin(path, { component, displayName, icon })`.
To hide a plugin from the sidebar without removing its route, pass `hidden: true`
to `registerPlugin`. The `SideNav` filters it out; `Routes` still registers it.

To group plugins under an accordion in the sidebar, pass `group: '/some/path'` to
`registerPlugin`. If that group path hasn't been registered as a stub plugin itself,
it is auto-created (using `Folder` icon and a title derived from the path segment).
Only plugins with `component` and `group` (and not `hidden`) appear as accordion children.

A plugin's position within its sidebar group is **not** controlled by any priority field.
`useGetNavRoutes` (`core/routes/hooks.ts`) walks `Object.entries(pluginMap)` in plugin
*registration* order — i.e. the order `registerPlugin` calls actually execute across every
plugin's `index.ts`, which is driven by the call order of the `register*()` functions in
`Root.tsx`. To make a page from one plugin render above a page from a plugin registered
earlier in `Root.tsx`, export a separate registration function for just that one page and
call it earlier in `Root.tsx` (before the plugin whose entry it needs to precede) — don't
reorder the whole plugin's registration call, or you'll also reorder its other sidebar
entries. See `registerActiveTasks` in `plugins/manage-tasks/index.ts`.

Also note: a group's own stub path (e.g. `/tasks`, registered with no `component`) is never
a real page — it has no route in `Routes.tsx`, and clicking the accordion header navigates
to the group's first child instead. Don't `push()` to a group's stub path expecting to land
on a page.

Plugins should be self-contained — do not import hooks, utils, or types from other
plugin folders. If two plugins share logic, copy the relevant files into each plugin's
own folder rather than creating a cross-plugin dependency.

## SideNav collapse/expand (mini variant)
`SideNav`/`Entry.tsx` render two structurally different layouts depending on the
`sidebarOpen` boolean (threaded down from `Layout.tsx`'s toggle state into both `Entry`
and `AccordionEntry`), not just a CSS width change:
- `SideNavEntry` hides its `ListItemText` label when `sidebarOpen` is false (icon only).
- `AccordionEntry`, when collapsed, bypasses the `ExpansionPanel` entirely (no room for the
  expand arrow or indentation) and instead renders the group's icon as a plain link to its
  first child. Only the currently-**open** group's children render as their own icon-only
  rows below it — clicking a collapsed group's icon calls `onToggle(true)` (which also sets
  the parent's `openGroup` state) rather than just navigating, so opening one group
  implicitly closes any other.
- To force a row's active-tint on or off independent of its own `path` (e.g. the collapsed
  group's own row should never show the tint, even though one of its children matches the
  current route), use `SideNavEntry`'s `activeOverride` prop — it fully replaces the
  natural `location.pathname.startsWith(path)` check rather than only being able to force
  it on.

Every nav row (group header, standalone entry, sub-entry) must use a fixed `height` (not
just `min-height`) — see `navRowHeight` in `SideNav/styles.ts`. MUI's `ListItemText`
carries its own 4px top/bottom margin that an icon-only row doesn't have, so a
`min-height` alone lets rows with a label render a few px taller than icon-only rows,
causing every row below to shift up/down each time the sidebar is toggled.

## Sub-navigation within a plugin
To add an inline tab bar at the top of a plugin page, render a `<Toolbar disableGutters>`
containing MUI `<Tabs>` / `<Tab>` as the first child inside `<NoPaddingWrapper>`, then
render page content below it. See `src/plugins/manage-tasks/SubNav.tsx` for the pattern.
Pages that share a SubNav should be registered as separate routes (some `hidden: true`).
When the shared param (e.g. `:taskId`) sits in the *middle* of every tab's path (e.g.
`/tasks/current/:taskId/edit`, `.../add-series`, `.../backfill`), extract it once with a
single `useRouteMatch<{ taskId: string }>('/tasks/current/:taskId')` — it matches as a
prefix against any of the tab routes — rather than an array of full per-tab patterns, and
derive the active tab from the URL's last path segment
(`location.pathname.split('/').filter(Boolean).pop()`) instead of matching a leading-path
array. Append the param when navigating between tabs so it's preserved:
`history.push(`/tasks/current/${taskId}/${suffix}`)`. Only render the SubNav at all when
the param is present — a page that also serves a paramless route (e.g. `EditTask` at
`/tasks/create-task`) should hide it there.

## Optional URL path params
`PrivateRoute` does not use `exact`, so a plugin registered at `/foo` also matches
`/foo/some-id`. Use `useRouteMatch<{ id: string }>('/foo/:id')` inside the component to
extract the optional param — it returns `null` when the segment is absent. No route
registration change is needed to support the param.

`registerPlugin`'s `path` isn't limited to a literal prefix either — it can itself contain
react-router param syntax (e.g. `/tasks/current/:taskId/edit`), since `useGetRoutes` passes
it straight through to `Route`'s `path` prop. This is how a param can sit in the *middle*
of a path rather than trailing it.

## Route registration order for paths nested under another registered route
Because `PrivateRoute` isn't `exact`, a route like `/tasks/current` (Active Tasks) also
prefix-matches a more specific, nested path like `/tasks/current/mytask/edit`. `Switch`
renders whichever matching route appears *first* in the `routes` array, which follows
plugin *registration* order (the same `Object.entries(pluginMap)` order that governs
sidebar position, see "Plugin registration" above). So when adding routes nested under an
existing page's path, register the more specific routes **before** the existing page's own
`registerPlugin` call — otherwise the parent page's route swallows requests meant for the
nested ones. See `registerActiveTasks` in `plugins/manage-tasks/index.ts`, where
`/tasks/current/:taskId/edit`, `.../add-series`, and `.../backfill` are registered ahead of
`/tasks/current` itself.

## Reusing one page across multiple registered routes
A single plugin page can be reachable at more than one URL — e.g. `EditTask` serves both
`/tasks/create-task` (no `SubNav`, create mode) and `/tasks/current/:taskId/edit` (`SubNav`
visible, edit mode). Hoist the `lazy(() => import(...))` call to a module-level const and
pass that same reference to both `registerPlugin` calls, rather than calling `lazy()`
twice, so there's one component reference (and Webpack chunk) backing both routes. Inside
the component, branch on whether the route's param matched (e.g. `taskId` present vs
`undefined`) to vary rendering.

## API hooks
- `useFlexgetAPI<T>(url, method)` — REST calls; URL is fixed at hook creation time.
- `useFlexgetStream(url, method)` — oboe streaming; returns `[{ stream, readyState }, { connect, disconnect }]`.
  Attach `.node()`, `.done()`, `.fail()` handlers in a `useEffect([stream])` — the hook itself only
  handles `.start()` and `.fail()` for `ReadyState`. There is NO built-in `.done()` handler, so
  `readyState` never returns to `Closed` on a successful stream; attach `.done()` directly on the
  stream object to detect completion.
- Request bodies are auto-converted to snake_case; responses are auto-camelized.
- `useFlexgetAPI` URL is fixed per render. For DELETE/PUT calls where the path param
  changes at submit time (e.g. task name edited by user), store the value in `useState`
  and pass it to the hook — a re-render updates the request fn. When that request fires
  after an async operation (e.g. a stream `.done()`), hold the callback in a `useRef`
  so the stream effect doesn't list the callback as a dep and won't re-attach handlers
  on re-render: `const ref = useRef(fn); useEffect(() => { ref.current = fn; }, [fn]);`

## MUI + Emotion css prop conflict
When extending `React.HTMLAttributes<HTMLDivElement>` for a component that renders
inside MUI/Emotion, use `Omit<React.HTMLAttributes<HTMLDivElement>, 'css'>`.
Emotion globally augments `HTMLAttributes` with its own `css` type, which conflicts
with MUI Box's `css` prop, causing a TS error at component definition time.

## Testing
- MUI v4 `TextField` without an explicit `id` prop doesn't wire `htmlFor` in JSDOM.
  Use `container.querySelector('[name="fieldName"]')` instead of `getByLabelText`.
- `@testing-library/react` v9 has no `name` option on `getByRole`.
  Use `getByText('Label').closest('button')` for buttons.
- `act` is not exported from `@testing-library/react` v9; import from `react-dom/test-utils`.
- To mock `useFlexgetStream` in tests, use `jest.spyOn(coreApi, 'useFlexgetStream')` —
  ts-jest compiles to CommonJS so named-import spying works.
- Async tests that involve navigation → API fetch → Formik reinitialize need extended
  timeouts; set `jest.setTimeout(15000)` in `beforeAll`.
- MUI v4 `Select` doesn't wire `[data-value]` reliably in JSDOM. Open with
  `fireEvent.mouseDown(selectEl)`, then find options via
  `document.querySelectorAll('[role="option"]')` (they render into a portal) and
  match by `el.textContent?.trim()`.
- When multiple `Select` components are on the page, `.MuiSelect-root` indices follow
  JSX render order, not visual position. Confirm the index of the target Select before
  using it in a test.
- When `fetchMock` returns a non-ok status the error object carries a `message` string
  (the HTTP status text), so a `?? 'Unknown error'` fallback is never reached that way.
  To test the unknown-error path, mock the hook directly:
  `jest.spyOn(hooks, 'useCreate...').mockReturnValue([..., jest.fn().mockResolvedValue({ ok: false, error: undefined })])`
- `useFlexgetAPI` camelizes response keys, including user-defined ones (e.g., `GroupA` → `groupA`).
  In test fixtures that contain domain-defined keys (group names, etc.), use all-lowercase or
  already-camelCase names so the fixture value matches what Formik and the DOM actually see.
- To inspect the body of a specific fetchMock call, filter by URL and method then parse:
  `const calls = fetchMock.calls().filter(([url, opts]) => url === '/api/foo' && opts?.method === 'put');`
  `const body = JSON.parse(calls[0][1].body as string);`
- When a SubNav renders tab buttons with the same text as form buttons (e.g. "Add Series"),
  `getByText` throws "multiple elements found". Disambiguate by querying all buttons and
  filtering out MUI tab buttons: `Array.from(container.querySelectorAll('button')).find(btn =>
  btn.textContent?.trim() === 'Label' && !btn.classList.contains('MuiTab-root'))`.
- When a component imports hooks from a local copy (e.g. `./backfillHooks`), spy on that
  local module — not the original source — so the mock intercepts the right import:
  `jest.spyOn(localHooks, 'useCreateTask')`. The spy target must match the import path in
  the component under test.
- Components that only call `useInjectPageTitle` do not need `<AppBar>` or container
  providers in the test wrapper — the hook no-ops gracefully when the AppBar context is absent.
- `wait(callback)` from `@testing-library/react` v9 resolves to `Promise<void>` — it does
  **not** return the callback's return value (unlike the newer `waitFor`). Don't write
  `const x = await wait(() => { ...; return foo; })`; instead `await wait(() => expect(...))`
  and then query for what you need separately afterward.
- Neither jsdom's `getComputedStyle` nor the `jest-emotion` snapshot serializer (despite
  being configured in `jest.config.js`) resolves Emotion's `css` prop in this project's test
  setup — both a snapshot and `getComputedStyle` just show `css={[Function]}`/no value for
  it. Don't write assertions against actual CSS output (colors, heights, etc.); test
  structure and behavior instead (element counts, text presence, handlers called).

## Build and packaging
- Local production build: `./package.sh` — runs Webpack, outputs to `dist/`, zips to `dist.zip`
- `dist/index.html` contains `{{ base_url }}/` — a Jinja2 placeholder Flexget substitutes at
  runtime with the path prefix. Do not expect the built HTML to be directly openable in a browser
  without substitution.
- API calls are made to `/api${url}` (relative to the page's base URL), not to an absolute host.

## Monaco editor (Config plugin)
- `monaco-editor/esm/vs/editor/editor.api.js` sets `window.monaco = api` at module load time.
  `monaco-yaml` reads `monaco` as a bare global — it must be imported first.
- The lazy loader in `config/index.ts` awaits monaco-editor, then monaco-yaml, then Config in that
  order. This ordering is load-bearing; changing it reintroduces the `monaco is not defined` error.
- Monaco theme registration lives in `Editor.tsx` (not `core/theme/index.ts`) so that monaco-editor
  stays out of the initial bundle. Do not add Monaco imports back to `core/theme/index.ts`.
- Do not apply `padding` or `margin` to Monaco's internal CSS elements (`.margin`,
  `.editor-scrollable`) — it breaks cursor coordinate mapping so clicks land at the wrong position.
  To add breathing room around the editor, wrap `<MonacoEditor>` in a plain `div` and set
  `padding` and `backgroundColor` on the wrapper instead.

## E2e tests
- Run: `yarn test:e2e` (builds first, then runs Playwright against `dist/`)
- Requires `dist/` to be built; the script handles this automatically.
- Playwright 1.44 is pinned — it is the last release supporting Node 16. Do not upgrade until
  the project moves to Node 18+.
- The static server (`scripts/serve-dist.js`) substitutes `{{ base_url }}/` with `/` in
  `index.html` and returns `401` for all `/api/*` paths so the login form renders correctly.

## TypeScript generics and heterogeneous useMemo arrays
When a `useMemo` returns an array that spreads two differently-shaped objects
(e.g. one branch has `field: number`, another has `field: undefined`), TypeScript
can't infer a single `T` for a generic prop like `Row<T>[]`. Fix: add an explicit
return type annotation to the `useMemo` callback:
```ts
const rows = useMemo(
  (): Array<{ key: React.Key; data: { [key: string]: React.ReactNode }; props?: ... }> => {
    ...
  },
  [...deps],
);
```

## MUI variant values differ by component
Input components (`TextField`, `FormControl`) accept `variant: "standard" | "outlined" | "filled"`.
`Button` accepts `variant: "text" | "outlined" | "contained"`.
These are different prop sets — avoid `replace_all` across both component types when
only targeting one.

## Sizing a flexible element to fill the viewport
When a page contains one vertically-flexible element (e.g. a Monaco editor) and you want a
reference point (a button, a card bottom) to stay at the viewport edge, use this self-correcting
formula:
```ts
target = currentHeight + (window.innerHeight - referenceEl.getBoundingClientRect().bottom)
```
If the reference element has an outer margin, also subtract
`parseFloat(getComputedStyle(referenceEl).marginBottom)`.
Store `currentHeight` in a `useRef` (updated alongside `setState`) so a stable
`useCallback([])` can read it without becoming a dep. The formula converges in one paint and is
immune to internal padding or margins on the flexible element — no need to measure them separately.

## External input labels (caption above input)
To label an input with a small caption above it — rather than MUI's floating label — use a
`Box position="relative"` wrapper with a `Typography variant="caption" color="textSecondary"`
label positioned absolutely above the field:
```tsx
<Box position="relative">
  <Typography
    variant="caption"
    color="textSecondary"
    style={{ position: 'absolute', bottom: '100%', left: 0, whiteSpace: 'nowrap' }}
  >
    Label text
  </Typography>
  <TextField variant="outlined" ... />  {/* no label prop */}
</Box>
```
Use `left: 0` for left-aligned labels, `left: '50%'` + `transform: 'translateX(-50%)'` for
centered. The label floats into the padding above the input and does not affect the Box's layout
height. To normalise the input height, add to the wrapping Paper's Emotion CSS:
`.MuiOutlinedInput-input:not(.MuiOutlinedInput-inputMultiline) { padding-top: 12px; padding-bottom: 12px; }`
See `BackfillEpisodes.tsx` and `EditTask.tsx` for usage.

## Fetching complete record sets
Flexget's paginated endpoints default to a small page size. When you need the full
set for a client-side comparison (e.g. all executed task names), use `?per_page=10000`
to fetch in one request rather than paginating.

When an endpoint has no pagination/sort query params at all (e.g. `/tasks`, which always
returns the complete list), you can still reuse the `Formik` + `DefaultOptions` +
`TaskTable` pagination/sort pattern from paginated pages — just sort/slice the full
fetched array on the client instead of passing query params to the API. See
`plugins/manage-tasks/ActiveTasks.tsx`.

## Fixed-width table columns without hardcoded pixels
To make an MUI `TableCell` column shrink to fit only its header text (plus whatever
padding is already in place), apply `style={{ width: '1%', whiteSpace: 'nowrap' }}` to
every cell in that column (both the header row and every body row) rather than a
hand-picked pixel width. In an auto-layout table this forces the browser to size the
column from its intrinsic content width, so it stays correct if theme/typography changes.

## Grouped table headers (two-tier TableHead)
To render a header row that groups several columns under one label (e.g. "Latest
Execution" spanning two columns), add a second `<TableRow>` above the normal header row
inside `<TableHead>`, with one `<TableCell colSpan={n}>` per group. Give each group cell
`border-bottom: none` (via the Emotion `css` prop) so no horizontal rule appears between
the group row and the column-header row below it. To carry a group boundary down as a
faint vertical divider through the header and body rows, precompute a boolean array
aligned with the flattened column list marking "last column of a group" and apply
`border-right: 1px solid theme.palette.divider` to matching cells. See
`ActiveTasksTable.tsx`'s `getColumnDividerFlags`.

## CSS Grid column overflow
`1fr` in a grid template is actually `minmax(auto, 1fr)` — the column's minimum is its
content width, so wide content (e.g. a long Select value) can still expand the page.
Use `minmax(0, 1fr)` to allow the column to shrink and let overflow/ellipsis handling
take over:
```css
grid-template-columns: max-content minmax(0, 1fr);
```

## Toast notifications (Snackbar)
Use MUI v4 `Snackbar` for transient success/error messages. Standard pattern
(see `AddSeries.tsx`, `BackfillEpisodes.tsx`):
```tsx
const [snackOpen, setSnackOpen] = useState(false);
// on success:
setSnackOpen(true);
// in JSX:
<Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)} message="..." />
```
When the message varies by action, add a separate `snackMessage` string state alongside
`snackOpen` and set both together on success.

## API error dialogs
For a failed API response (e.g. a PUT that returns non-ok), surface `resp.error?.message`
in a Dialog rather than only `console.error`-ing it — a Snackbar alone is easy to miss and
gives no room for a multi-line server message. Standard pattern (see `EditTask.tsx`,
`AddSeries.tsx`):
```tsx
const [errorMessage, setErrorMessage] = useState<string | null>(null);
// on failure:
setErrorMessage(resp.error?.message ?? 'An unknown error occurred');
// in JSX:
<Dialog open={errorMessage !== null} onClose={() => setErrorMessage(null)}>
  <DialogTitle>API Error Response</DialogTitle>
  <DialogContent><DialogContentText>{errorMessage}</DialogContentText></DialogContent>
  <DialogActions><Button onClick={() => setErrorMessage(null)}>Close</Button></DialogActions>
</Dialog>
```
Keep the success Snackbar's `setSnackOpen(true)` independent of any post-success cleanup
(e.g. a config reload) — wrap that cleanup in its own try/catch so its failure can't
suppress a toast for a mutation that already succeeded.

## Formik field-level validation
To reject a bad value at submit time by marking the specific field invalid (red border +
helper text) rather than showing a generic error, pass a `validate` prop to `Formik`
returning a `Partial<FormValues>` of `{ fieldName: 'message' }` for each invalid field.
Formik runs `validate` before calling `onSubmit` and marks all fields `touched` on a submit
attempt, so `common/inputs/formik/TextField`'s existing `touched && error` check shows the
message with no extra wiring. See `addSeriesUtils.ts`'s `validate` (required + YAML parse
check) and `backfillEpisodesUtils.ts`'s `validate` (required-field version).

## State survival through history.push on the same route
When `history.push` navigates to a URL that matches the same component (e.g. within a
route registered with an optional trailing param), the component is **not** unmounted —
React re-renders it with new route params. Local state (including `snackOpen`) survives
the navigation.

This also holds across two *different* registered routes, as long as they render the same
component reference at the same position inside `<Switch>` — e.g. `EditTask` is registered
separately at both `/tasks/create-task` and `/tasks/current/:taskId/edit` via a single
shared `EditTaskComponent` lazy reference (see "Reusing one page across multiple registered
routes" above). `Switch` renders whichever matched `<Route>`'s output directly into that one
child slot, so React reconciles by component type/position, not by which `Route`/path
matched — the instance (and its local state) survives the URL swap instead of unmounting
and remounting. This is why a "Task Created" toast set before `history.push` in `EditTask`'s
create-mode submit handler remains visible after the URL changes to the new task's edit
page, even though `/tasks/create-task` and `/tasks/current/:taskId/edit` are separate
`registerPlugin` entries.
