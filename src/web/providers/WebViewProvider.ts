import * as vscode from 'vscode';

export class HerWebView implements vscode.WebviewViewProvider {
    constructor(private readonly _extensionUri: vscode.Uri) { }
    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        }

        const nonce = getNonce();

        const cssStylesheets = ['main.css']
            .map(i => `<link href="${webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'web', 'webview', i))}" rel="stylesheet"/>`)

        const jsScripts = ['main.js']
            .map(i => `<script type="module" nonce="${nonce}" src="${webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'web', 'webview', i))}"></script>`)

        const html = `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8"/>
        <meta content="IE=edge" http-equiv="X-UA-Compatible"/>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webviewView.webview.cspSource}; script-src 'nonce-${nonce}';"/>
        <meta content="width=device-width, initial-scale=1" name="viewport"/>
        <title>HER</title>
        ${cssStylesheets.join('')}
        ${jsScripts.join('')}
    </head>
    <body><div id="actions"><div>Insert Type:<label><input name="inserttype" type="radio" value="name" checked/>name</label><label><input name="inserttype" type="radio" value="hex"/>hex</label><label><input name="inserttype" type="radio" value="decimals"/>decimal</label><label><input name="inserttype" type="radio" value="glyph"/>glyph</label><label><input name="inserttype" type="radio" value="unicode"/>unicode</label></div><div><label>Sort: <select id="select_sort"><option value="asc">ascending</option><option value="desc">descending</option><option value="decimal_asc">decimal ascending</option><option value="decimal_desc">decimal descending</option></select></label></div><div><fieldset id="categories"><legend>Categories</legend></fieldset></div></div><main></main></body>
</html>
`;

        webviewView.webview.html = html;

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.event) {
                case 'selected':
                    {
                        const ate = vscode.window.activeTextEditor;
                        if (ate === undefined) return;

                        let out: string;
                        switch (data.it) {
                            case 'name':
                                out = data.entity.entity;
                                break;
                            case 'hex':
                                out = data.entity.hex.map((i: any) => `&#x${i};`).join('');
                                break;
                            case 'decimals':
                                out = data.entity.decimals.map((i: any) => `&#${i};`).join('')
                                break;
                            case 'glyph':
                                out = data.entity.glyph;
                                break;
                            case 'unicode':
                                if (ate.document.languageId.endsWith("css")) {
                                    out = data.entity.hex.map((i: string) => '\\' + i).join('');
                                }
                                else {
                                    out = data.entity.hex.map((i: string) => '\\u' + i).join('');
                                }
                                break;
                        }

                        const here = ate.selection.active;
                        ate.edit(b => b.insert(here, out));
                        ate.revealRange(new vscode.Range(here, here));
                        break;
                    }
            }
        });
    }

}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}