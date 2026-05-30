import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const MDN_BASE = `https://developer.mozilla.org/en-US/docs/Web/API`;

const MDN_URLS = {
	DataTransfer: {
		ctr: {
			url: 'DataTransfer',
			label: label => `event.${label}`
		},
		getData: {
			url: 'DataTransfer/getData',
			label: 'getData(type)'
		}
	},
	ClipboardItem: {
		ctr: {
			url: 'ClipboardItem',
			label: () => 'ClipboardItem'
		},
		getData: {
			url: 'ClipboardItem/getType',
			label: 'getType(type)'
		}
	}
};

async function extractData(data) {
	if (!data) {
		return undefined;
	}

	const file_info = file =>
		file
			? {
					name: file.name,
					size: file.size,
					type: file.type,
					url: URL.createObjectURL(file)
			  }
			: null;

	if (data instanceof DataTransfer) {
		return {
			type: 'DataTransfer',
			types: Array.from(data.types).map(type => ({
				type,
				data: data.getData(type)
			})),
			items: data.items
				? await Promise.all(
						Array.from(data.items).map(async item => ({
							kind: item.kind,
							type: item.type,
							as_string_or_file:
								item.kind === 'string'
									? await new Promise(r =>
											item.getAsString(r)
									  )
									: file_info(item.getAsFile())
						}))
				  )
				: null,
			files: data.files ? Array.from(data.files).map(file_info) : null
		};
	}

	if (data instanceof ClipboardItem) {
		return {
			type: 'ClipboardItem',
			types: await Promise.all(
				Array.from(data.types).map(async type => {
					const blob = await data.getType(type);
					return {
						type: type,
						data: blob.type.match(/(^text\/)|(image\/svg\+xml$)/)
							? await blob.text()
							: file_info(blob)
					};
				})
			)
		};
	}
	return undefined;
}

function ClipboardInspector(props) {
	const { data, label, onReadClipboard, onEdit, onClear } = props;
	const has_async_clipboard =
		!navigator.clipboard || !navigator.clipboard.read;
	const paste = useCallback(
		e => {
			onReadClipboard();
		},
		[onReadClipboard]
	);

	const autoselect = useCallback(e => {
		const range = document.createRange();
		range.selectNodeContents(e.target);
		const selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	}, []);

	function render_file(file) {
		return file ? (
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Size</th>
						<th>Type</th>
						<th>
							<a
								className="mdn"
								href={`${MDN_BASE}/URL/createObjectURL`}
							>
								URL.createObjectURL(file)
							</a>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<code>{file.name}</code>
						</td>
						<td>
							<code>{file.size}</code>
						</td>
						<td>
							<code>{file.type}</code>
						</td>
						<td>
							<code>
								<a href={file.url}>
									<img src={file.url} />
								</a>
							</code>
						</td>
					</tr>
				</tbody>
			</table>
		) : (
			<em>N/A</em>
		);
	}

	if (!data.length) {
		return (
			<div className="intro-msg">
				<h2>To get started, either:</h2>
				<ul>
					<li>
						<button disabled={has_async_clipboard} onClick={paste}>
							Paste using the Clipboard API
						</button>{' '}
						if your browser supports the Asynchronous Clipboard API
					</li>
					<li>
						Paste with the <kbd>Ctrl+V</kbd> / <kbd>⌘V</kbd>{' '}
						keyboard shortcut or{' '}
						<span contentEditable onFocus={autoselect}>
							paste in here
						</span>{' '}
						if you don't have a keyboard
					</li>
					<li>Drop something on the page</li>
				</ul>
			</div>
		);
	}

	return (
		<div>
			<button type="button" onClick={e => onClear()}>
				← Go back
			</button>
			{data.map((render_data, idx) => {
				const URLS = MDN_URLS[render_data.type];
				const editable = (render_data.types || []).filter(
					t => typeof t.data === 'string'
				);
				return (
					<div className="clipboard-summary" key={idx}>
						<h2>
							<a
								className="mdn"
								href={`${MDN_BASE}/${URLS.ctr.url}`}
							>
								{URLS.ctr.label(label)}
							</a>{' '}
							contains:
						</h2>

						{editable.length > 0 && (
							<p>
								<button
									type="button"
									onClick={e => onEdit(editable)}
								>
									✎ Load {editable.length} text type(s) into
									the editor
								</button>
							</p>
						)}

						{render_data.types && (
							<div className="clipboard-section">
								<h3>
									<a
										className="mdn"
										href={`${MDN_BASE}/DataTransfer/types`}
									>
										.types
									</a>
									<span className="anno">
										{render_data.types.length} type(s)
										available
									</span>
								</h3>
								<table>
									<thead>
										<tr>
											<th>type</th>
											<th>
												<a
													className="mdn"
													href={`${MDN_BASE}/${URLS.getData.url}`}
												>
													{URLS.getData.label}
												</a>
											</th>
										</tr>
									</thead>
									<tbody>
										{render_data.types.map((obj, idx) => (
											<tr key={idx}>
												<td>
													<code>{obj.type}</code>
													{obj.type.match(
														/^text\//
													) &&
														navigator.clipboard &&
														navigator.clipboard
															.writeText && (
															<div class="cb-copy">
																<button
																	onClick={e =>
																		navigator.clipboard.writeText(
																			obj.data
																		)
																	}
																>
																	Copy as
																	plain text
																</button>
															</div>
														)}
												</td>
												<td>
													<pre class="cb-entry">
														<code>
															{typeof obj.data ===
															'object'
																? render_file(
																		obj.data
																  )
																: obj.data || (
																		<em>
																			Empty
																			string
																		</em>
																  )}
														</code>
													</pre>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						{render_data.items && (
							<div className="clipboard-section">
								<h3>
									<a
										className="mdn"
										href={`${MDN_BASE}/DataTransfer/items`}
									>
										.items
									</a>
									<span className="anno">
										{render_data.items ? (
											`${render_data.items.length} item(s) available`
										) : (
											<em>Undefined</em>
										)}
									</span>
								</h3>

								{render_data.items ? (
									<table>
										<thead>
											<tr>
												<th>kind</th>
												<th>type</th>
												<th>
													<a
														className="mdn"
														href={`${MDN_BASE}/DataTransferItem/getAsString`}
													>
														getAsString()
													</a>{' '}
													{' / '}
													<a
														className="mdn"
														href={`${MDN_BASE}/DataTransferItem/getAsFile`}
													>
														getAsFile()
													</a>
												</th>
											</tr>
										</thead>
										<tbody>
											{render_data.items.map(
												(item, idx) => (
													<tr key={idx}>
														<td>
															<code>
																{item.kind}
															</code>
														</td>
														<td>
															<code>
																{item.type}
															</code>
														</td>
														<td>
															{item.kind ===
															'string' ? (
																<pre class="cb-entry">
																	<code>
																		{item.as_string_or_file || (
																			<em>
																				Empty
																				string
																			</em>
																		)}
																	</code>
																</pre>
															) : (
																render_file(
																	item.as_string_or_file
																)
															)}
														</td>
													</tr>
												)
											)}
										</tbody>
									</table>
								) : null}
							</div>
						)}

						{render_data.files && (
							<div className="clipboard-section">
								<h3>
									<a
										className="mdn"
										href={`${MDN_BASE}/DataTransfer/files`}
									>
										.files
									</a>
									<span className="anno">
										{render_data.files
											? `${render_data.files.length} file(s) available`
											: '<em>Undefined</em>'}
									</span>
								</h3>
								{render_data.files ? (
									render_data.files.map((file, idx) => (
										<div key={idx}>{render_file(file)}</div>
									))
								) : (
									<span>N/A</span>
								)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

// Common MIME types offered as suggestions in the editor's type field.
const COMMON_TYPES = [
	'text/plain',
	'text/html',
	'text/uri-list',
	'image/svg+xml',
	'application/json'
];

function ClipboardEditor({ entries, setEntries }) {
	const [status, setStatus] = useState(null);

	const can_write =
		typeof ClipboardItem !== 'undefined' &&
		navigator.clipboard &&
		navigator.clipboard.write;

	const update = (idx, patch) =>
		setEntries(
			entries.map((entry, i) =>
				i === idx ? { ...entry, ...patch } : entry
			)
		);
	const add = () =>
		setEntries([...entries, { type: 'text/plain', data: '', web: false }]);
	const remove = idx => setEntries(entries.filter((_, i) => i !== idx));

	const write = async () => {
		try {
			const payload = {};
			for (const entry of entries) {
				const type = entry.type.trim();
				if (!type) continue;
				// Non-standard types are only accepted by clipboard.write() when
				// registered as a "web custom format", i.e. prefixed with "web ".
				// The Blob itself keeps the bare MIME type either way.
				const key = entry.web ? `web ${type}` : type;
				payload[key] = new Blob([entry.data], { type });
			}
			if (!Object.keys(payload).length) {
				setStatus({ ok: false, msg: 'Add at least one typed entry.' });
				return;
			}
			await navigator.clipboard.write([new ClipboardItem(payload)]);
			setStatus({
				ok: true,
				msg: `Wrote ${
					Object.keys(payload).length
				} type(s) to the clipboard. Paste above to verify.`
			});
		} catch (err) {
			setStatus({ ok: false, msg: String(err) });
		}
	};

	return (
		<div className="clipboard-section clipboard-editor">
			<h2>Edit &amp; write the clipboard</h2>
			<p>
				Add one entry per MIME type, then write them together as a
				single{' '}
				<a className="mdn" href={`${MDN_BASE}/ClipboardItem`}>
					ClipboardItem
				</a>
				. Each type is preserved exactly. Browsers only allow a limited
				set of standard types (e.g. <code>text/plain</code>,{' '}
				<code>text/html</code>, <code>image/png</code>) to be written
				directly. For anything else (e.g.{' '}
				<code>application/x-canva</code>), tick{' '}
				<strong>web custom format</strong> — the type is registered with
				a <code>web </code> prefix per the{' '}
				<a
					className="mdn"
					href="https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem#using_unsanitized_html_and_custom_clipboard_data"
				>
					Clipboard spec
				</a>
				, which only other web apps can read back (native apps won't see
				it). Otherwise the write reports an error below.
			</p>

			<datalist id="common-mime-types">
				{COMMON_TYPES.map(t => (
					<option key={t} value={t} />
				))}
			</datalist>

			<table>
				<thead>
					<tr>
						<th>type</th>
						<th>web custom format</th>
						<th>data</th>
						<th />
					</tr>
				</thead>
				<tbody>
					{entries.map((entry, idx) => (
						<tr key={idx}>
							<td>
								<input
									type="text"
									list="common-mime-types"
									value={entry.type}
									placeholder="text/plain"
									onChange={e =>
										update(idx, { type: e.target.value })
									}
								/>
							</td>
							<td className="cb-web-cell">
								<label>
									<input
										type="checkbox"
										checked={!!entry.web}
										onChange={e =>
											update(idx, {
												web: e.target.checked
											})
										}
									/>{' '}
									{entry.web ? (
										<code>web {entry.type.trim()}</code>
									) : (
										'standard'
									)}
								</label>
							</td>
							<td>
								<textarea
									className="cb-editor-data"
									rows={3}
									value={entry.data}
									onChange={e =>
										update(idx, { data: e.target.value })
									}
								/>
							</td>
							<td>
								<button
									type="button"
									onClick={e => remove(idx)}
									disabled={entries.length === 1}
								>
									✕
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			<p>
				<button type="button" onClick={add}>
					+ Add type
				</button>{' '}
				<button type="button" onClick={write} disabled={!can_write}>
					Write to clipboard
				</button>
				{!can_write && (
					<span className="anno">
						This browser doesn't support{' '}
						<code>navigator.clipboard.write()</code>.
					</span>
				)}
			</p>

			{status && (
				<p className={status.ok ? 'editor-ok' : 'editor-err'}>
					{status.msg}
				</p>
			)}
		</div>
	);
}

function App() {
	const [data, setData] = useState([]);
	const [label, setLabel] = useState(null);
	const [entries, setEntries] = useState([
		{ type: 'text/plain', data: '', web: false }
	]);

	const show = useCallback(async (payload, lbl) => {
		const extracted = payload
			? await Promise.all(
					(Array.isArray(payload) ? payload : [payload]).map(
						extractData
					)
			  )
			: [];
		setData(extracted);
		setLabel(lbl);
	}, []);

	const readClipboard = useCallback(() => {
		navigator.clipboard.read().then(items => {
			show(items, 'ClipboardItems');
		});
	}, [show]);

	const loadIntoEditor = useCallback(types => {
		setEntries(
			types.length
				? types.map(t => ({ type: t.type, data: t.data, web: false }))
				: [{ type: 'text/plain', data: '', web: false }]
		);
		document
			.querySelector('.clipboard-editor')
			?.scrollIntoView({ behavior: 'smooth' });
	}, []);

	const clear = useCallback(() => {
		setData([]);
		setLabel(null);
	}, []);

	useEffect(() => {
		const on_paste = e => show(e.clipboardData, 'clipboardData');
		const on_dragover = e => e.preventDefault();
		const on_drop = e => {
			show(e.dataTransfer, 'dataTransfer');
			e.preventDefault();
		};
		document.addEventListener('paste', on_paste);
		document.addEventListener('dragover', on_dragover);
		document.addEventListener('drop', on_drop);
		return () => {
			document.removeEventListener('paste', on_paste);
			document.removeEventListener('dragover', on_dragover);
			document.removeEventListener('drop', on_drop);
		};
	}, [show]);

	return (
		<div>
			<ClipboardInspector
				data={data}
				label={label}
				onReadClipboard={readClipboard}
				onEdit={loadIntoEditor}
				onClear={clear}
			/>
			<ClipboardEditor entries={entries} setEntries={setEntries} />
		</div>
	);
}

ReactDOM.render(<App />, document.getElementById('app'));
