# Changelog

## 57.0.0 - 2026-10-17

- Increased the maximum number of pages per crawl batch from 500 to 1,000.
- Updated both crawler validation and the background crawl engine to use the new limit.

## 56.0.0 - 2026-10-17

- Saved-link rows now show only the page title and URL.
- Metadata, tags, notes, and other stored fields remain hidden in the collapsed list.
- Hidden fields remain stored and searchable; page metadata remains available through View metadata.

## 55.0.0 - 2026-10-17

- The Archive Database website-folder sidebar now shows only saved-link collections.
- Text, MHTML, WebArchive, and ZARC capture files no longer create separate rows in the link database.
- Existing captured formats are still detected for each link so their View actions continue to work.

## 54.0.0 - 2026-10-16

- Expanded link previews to fill the remaining browser height below the title and action tabs.
- Preview height is calculated from its actual position so it uses available space across different window sizes.
- Added a generous minimum preview height for captured text, MHTML, WebArchive, and live-page views.

## 53.0.0 - 2026-10-16

- Converted saved-link actions into a mutually exclusive tab interface.
- Only the selected metadata, live preview, text, MHTML, or WebArchive content is displayed at a time.
- Added active-tab styling and prevented slower preview requests from replacing a newer tab selection.

## 52.0.0 - 2026-10-16

- The page preview is now hidden until Live preview or a captured-version View action is clicked.
- View metadata hides the preview and brings the saved metadata panel into view.
- Completing metadata capture also closes any open preview so the metadata is the only detail content shown.

## 51.0.0 - 2026-10-16

- The Capture metadata action now changes to View metadata after metadata is fetched successfully.
- View metadata scrolls directly to the saved metadata panel.
- The captured state is stored with the saved link and remains available after reopening the Archive Database.

## 50.0.0 - 2026-10-16

- Added a Live preview button to the saved-link action toolbar; the live page is fetched only when requested.
- Capture buttons change into View text, View MHTML, or View WebArchive actions after a successful capture.
- Captured versions render in the same inline preview area, and existing captures are detected when link details reopen.

## 49.0.0 - 2026-10-16

- Moved all saved-link actions into one horizontal toolbar directly below the link title and URL.
- Added an inline rendered preview of the selected live page below the action toolbar.
- Kept stored page metadata visible below the preview for quick comparison with the live page.

## 48.0.0 - 2026-10-16

- Added a Capture metadata action to the saved-link details view.
- Metadata capture opens the live page temporarily, extracts its current metadata and searchable page text, then closes the temporary tab.
- Refreshed metadata appears immediately and is persisted back into the saved-link collection, including older collections that stored URLs as plain strings.

## 47.0.0 - 2026-10-16

- Replaced the expandable main menu with an always-visible horizontal toolbar fixed across the top of every extension page.
- All eight menu actions remain visible; narrower pages use compact icon buttons with accessible labels and tooltips.
- Made every saved-link result row clickable, including its title, URL, metadata area, and surrounding space.
- Link metadata and capture actions now open inside the existing right preview area instead of an overlay side drawer.
- Added keyboard activation and a Back to links action for the link details view.

## 46.0.0 - 2026-10-16

- Clicking a saved URL now opens a dedicated right-side details drawer.
- The drawer displays the link title, URL, and all stored page metadata.
- Added actions to capture the selected live page as plain text, MHTML, or WebArchive.
- Captures run in a temporary background tab, close automatically, and are registered in the Archive Database.
- Added Text and MHTML record filters and suitable database actions for these capture formats.

## 45.0.0 - 2026-10-16

- Replaced the database-only navigation block with a shared sticky main menu.
- The menu stays fixed in the top-right corner on every extension page and collapses into a compact button.
- Added direct access to Archive Database, Archive History, Archive Viewer, Crawler Settings, Website Capture, Feature Requests, Privacy, and Permissions from every page.
- Added responsive popup sizing, current-page highlighting, click-outside closing, and Escape-key support.

## 44.0.0 - 2026-10-16

- Restyled the Archive Database popup action to match the other full-width controls.
- Added a database icon, consistent spacing, rounded border, hover state, and keyboard focus styling.

## 43.0.0 - 2026-10-16

- Database search now returns individual matching URLs and archived pages in the main results pane.
- Saved-link collections are filtered using each link's URL, title, indexed page text, and fetched metadata instead of only the archive collection name.
- Search counts now report matching items rather than only matching archive containers.

## 42.0.0 - 2026-10-16

- Added a navigation hub to the Archive Database sidebar.
- Users can open Archive History, Archive Viewer, Crawler Settings, Website Capture, Feature Requests, Privacy, and Chrome extension permissions directly from the database.

## 41.0.0 - 2026-10-16

- Added instant database-wide search across saved archive records and saved links.
- Added full-page text indexing during crawling so searches can match page content as well as titles, URLs, and metadata.
- Added advanced filters for metadata field, record type, website, saved date range, and sorting.
- Added quoted phrase search and `content:`, `title:`, `url:`, `author:`, `keyword:`, `site:`, `lang:`, and `type:` operators.
- Saved-link previews now show only the links matching the current database query.

## 40.0.0 - 2026-10-16

- Replaced manually entered crawler metadata with metadata fetched directly from every visited page.
- Captures descriptions, keywords, authors, publication and modification dates, site name, page type, canonical URL, language, robots directives, content type, and social image URLs.
- Added a read-only metadata details control to each discovered link and preserves the fetched values in saved link lists and offline archive records.

## 39.0.0 - 2026-10-16

- Added an inline metadata editor to every discovered crawler link.
- Users can customize a link title and add comma-separated tags and notes before saving.
- Metadata is preserved for saved link lists and captured `.webarchive` pages and displayed in the Archive Database.

## 38.0.0 - 2026-10-16

- Replaced direct website iframe embedding with a sanitized rendered preview from a temporary background tab.
- Website previews now work when the source server blocks framing with X-Frame-Options or CSP frame-ancestors.
- Preview tabs close automatically and do not create saved offline copies.

## 37.0.0 - 2026-10-16

- Registers saved text link lists in the Archive Database under their source website.
- Opens the newly saved link-list thread automatically and previews its clickable URLs on the right.

## 36.0.0 - 2026-10-16

- Added Save selected links to download a plain-text URL list without creating offline page archives.
- Link lists are saved in the website-named Downloads folder with a timestamped filename.

## 35.0.1 - 2026-10-16

- Preserves the starting website URL alongside its tab ID.
- Recreates a temporary crawl tab when the original source tab has been closed or replaced.

## 35.0.0 - 2026-10-16

- Expanded crawler settings with a default option to exclude blog pages.
- Added controls for crawl depth, starting-path scope, include and exclude URL patterns, query variants, file types, downloads, and nofollow links.
- Added controls to ignore links found in headers, footers, navigation menus, and sidebars.
- Crawl rules are applied before a discovered URL is opened or added to the queue.

## 34.0.0 - 2026-10-16

- Streams each crawled page into the review list immediately instead of waiting for the full crawl batch.
- Opens the live preview as soon as the first page is discovered.
- Preserves selections and removed links when the final crawl results arrive.

## 33.0.0 - 2026-10-16

- Added a Hide log / Show log control to the website crawl page.
- Added resumable Crawl more pages batches that continue from the remaining queue while preserving results and selections.

## 32.0.0 - 2026-10-16

- Added compact, borderless actions to open each discovered page in a new tab or remove it from the crawl results.
- Removing a discovered page also clears it from the save selection.

## 31.0.1 - 2026-10-16

- Added a compatibility fallback from direct crawler messages to the extension's persistent crawler port.
- Replaced Chrome's raw missing-receiver error with instructions for recovering from a stale extension page.

## 31.0.0 - 2026-10-16

- Adapted Link Grabber's Manifest V3 anchor extraction for richer, normalized link discovery.
- Added duplicate detection, substring filtering, domain grouping, visible-link selection, and copying to the crawl review page.
- Added inherited blocked-domain rules to crawler settings, including comment lines and subdomain matching.
- Improved live crawl progress with queued-page and per-page link counts.
- Added the required Link Grabber MIT attribution in `THIRD_PARTY_NOTICES.md`.

## 30.0.1 - 2026-10-16

- Replaced the website crawler's persistent port with direct request/response messaging and explicit timeouts.

## 30.0.0 - 2026-10-16

- Added permission fallback crawling through temporary tabs and discarded in-memory page captures.
- Temporary crawl tabs close automatically after their links are inspected.

## 29.0.1 - 2026-10-16

- Fixed website crawling after extension reloads by reconnecting when a crawl starts and reporting disconnected workers.
- Waits for the source page to finish loading before discovering links.

## 29.0.0 - 2026-10-16

- Fixed database bundle rows so titles, metadata, and actions remain visible in a single row.
- Restored the bundle Add URLs and Save edited controls as readable full-width text buttons.

## 28.0.0 - 2026-10-16

- Website capture now crawls links first without saving files, then presents a selectable link list with a live preview pane.
- Only pages explicitly selected by the user are captured and saved as `.webarchive` files.

## 27.0.0 - 2026-10-16

- Added individual delete icons for saved website bundles and captured archive rows in the Archive Database.

## 26.0.0 - 2026-10-16

- Added a website-folder delete control that removes every archived file in the folder from disk and download history.
- Added an Add website URL control to start capturing another website from the Archive Database.

## 25.0.0 - 2026-10-16

- Restyled bundle page actions as small, borderless delete and open-in-new-tab icons.

## 24.0.0 - 2026-10-16

- Website crawling now saves individual `.webarchive` files in a website-named Downloads folder instead of creating a `.zarc` bundle.
- The Archive Database groups and previews these individual website captures.

## 23.0.0 - 2026-10-16

- Replaced the bundle page Open source and Delete actions with compact accessible icons.

## 22.0.0 - 2026-10-16

- Added a collapsible database sidebar with a remembered preference and a persistent expand control.
- Clarified the viewer sidebar toggle label as Collapse.

## 21.0.0 - 2026-10-16

- Added page deletion and URL capture controls in bundle previews, with Save edited .zarc to download the revised bundle.

## 20.0.0 - 2026-10-16

- Redesigned the Archive Database as a split view with website folders and bundle threads in the sidebar and an embedded preview pane.

## 19.0.0 - 2026-10-16

- Website capture now opens the Archive Database automatically after the `.zarc` bundle is saved.

## 18.0.1 - 2026-10-16

- Added host access required for the same-domain crawler to inspect links on pages it opens during a crawl.

## 18.0.0 - 2026-10-16

- Added an Archive database page that groups `.zarc` bundles by source website URL with nested bundle threads.

## 17.0.0 - 2026-10-16

- Moved crawler settings to an accessible gear icon in the popup header that opens the settings page.

## 16.0.0 - 2026-10-16

- Added live website-capture progress with a progress bar, current URL, page counter, and crawl log.

## 15.0.0 - 2026-10-16

- Added a settings page for the website crawler, including maximum page count and URL exception rules.

## 14.0.0 - 2026-10-16

- Added same-domain website capture, which discovers up to 100 pages from the current page and packages them into one `.zarc` bundle.

## 13.0.0 - 2026-10-16

- Archive-history search now indexes the contents of saved archives, including page text and embedded resource text, in addition to titles and URLs.

## 12.0.0 - 2026-10-16

- Added full archive-history search across titles, URLs, filenames, local paths, and archive metadata.
- Removed the previous 500-item download-history cap so search covers the complete available history.

## 11.0.0 - 2026-10-16

- Added a small “Request a feature” popup link that opens a dedicated request page.
- Feature requests open a prefilled email to boni.aditya@gmail.com with the installed extension version. Users review and send the email in their email app.
- Added image attachment support through file selection, paste, and drag-and-drop.

Major feature upgrades use the `x.0.0` version format and increment the major number.

## 10.0.0 - 2026-09-02

- Added local archive exports from the viewer.
- Added per-file export controls directly in the Downloads library.
- Added context-menu actions to save the tabs on the left or right of the current tab as one `.zarc` bundle.
- Updated the context-menu all-tabs action to create one `.zarc` bundle instead of separate archive files.
- Reworked the Downloads-library action area into a compact two-column layout.
- Added persistent history for `.webarchive` and `.zarc` files opened manually in the viewer.
- Added visual icons and a dropdown caret to Downloads-library export controls.
- Export a loaded `.webarchive` as a PDF through Chrome's Save to PDF dialog, standard `.mhtml`, standalone `.html`, plain-text `.txt`, or the original `.webarchive` file.
- MHTML and standalone HTML exports use only resources captured in the selected archive.

## 2.0.0 - 2026-08-12

- Added support for creating and opening bundled `.zarc` archive files.
- Added a tabbed bundle viewer so embedded `.webarchive` files can be opened from the left sidebar.
- Fixed bundled archive decoding so `.zarc` entries open correctly in the viewer.
- Added multi-select bundle creation from the downloaded archives library.
- Updated popup actions so:
  - `Save all tabs as .zarchive` creates one bundle for all open tabs.
  - `Save tabs on left as .zarchive` creates one bundle for all tabs to the left.
  - `Save tabs on right as .zarchive` creates one bundle for all tabs to the right.
- Updated popup labels and archive-management copy for the new bundle workflow.
- Updated extension metadata and plugin branding to credit `Boni Aditya`.
