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

Plugins should be self-contained — do not import hooks, utils, or types from other
plugin folders. If two plugins share logic, copy the relevant files into each plugin's
own folder rather than creating a cross-plugin dependency.

## Sub-navigation within a plugin
To add an inline tab bar at the top of a plugin page, render a `<Toolbar disableGutters>`
containing MUI `<Tabs>` / `<Tab>` as the first child inside `<NoPaddingWrapper>`, then
render page content below it. See `src/plugins/manage-tasks/SubNav.tsx` for the pattern.
Pages that share a SubNav should be registered as separate routes (some `hidden: true`).
Use `useRouteMatch` with an array of patterns to detect the active tab and to extract a
shared URL param (e.g. `:taskId`) across all tab routes, then append it when navigating
between tabs so the param is preserved.

## Optional URL path params
`PrivateRoute` does not use `exact`, so `/tasks/edit-task` also matches
`/tasks/edit-task/some-id`. Use `useRouteMatch<{ id: string }>('/tasks/edit-task/:id')`
inside the component to extract the optional param — it returns `null` when the segment
is absent. No route registration change is needed to support the param.

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

## State survival through history.push on the same route
When `history.push` navigates to a URL that matches the same component (e.g. from
`/tasks/edit-task` to `/tasks/edit-task/:id`), the component is **not** unmounted —
React re-renders it with new route params. Local state (including `snackOpen`) survives
the navigation. This is why a "Task Created" toast set before `history.push` remains
visible after the URL changes to the new task's edit page.
