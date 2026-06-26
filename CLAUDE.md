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

## Fetching complete record sets
Flexget's paginated endpoints default to a small page size. When you need the full
set for a client-side comparison (e.g. all executed task names), use `?per_page=10000`
to fetch in one request rather than paginating.
