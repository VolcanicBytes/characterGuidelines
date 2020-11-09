import { title } from 'process';
import { TextDecoder } from 'util';
import * as vscode from 'vscode';
import { Constants } from './constants';
import { PaddingFillerItem } from './PaddingFillerItem';
import { StatusBar } from './statusbarProxy';

export class CharacterGuidelines {

    public NewLineCount: number = 2;
    private rowLimit: number = 1;
    private charLimit: number = -1;
    private invalidDecorator: vscode.TextEditorDecorationType | undefined;
    private validDecorator: vscode.TextEditorDecorationType | undefined;

    public activeEditorUri: vscode.Uri | undefined;

    public active: boolean = false;

    private cumulativeValidRanges = new Array<vscode.DecorationOptions>();
    private cumulativeInvalidRanges = new Array<vscode.Range>();

    private _items = [
        new PaddingFillerItem("***", 1),
        new PaddingFillerItem("    ", 2),
        new PaddingFillerItem("___", 3),
        new PaddingFillerItem("---", 4),
        new PaddingFillerItem("abc", 5),
        new PaddingFillerItem("123", 6)
    ];

    constructor() {
        this.ReloadDecorators();
    }

    /**
     * ReloadData
     */
    public async ReloadData() {
        if (this.active && this.activeEditorUri && vscode.window.activeTextEditor && this.activeEditorUri == vscode.window.activeTextEditor.document.uri) {
            await this.ProcessActiveEditor();
            StatusBar.Update();
        }
        else
            StatusBar.Hide();
    }

    /**
     * reloadDecorators
     */
    public ReloadDecorators() {

        let invalidSection: vscode.DecorationRenderOptions | undefined = vscode.workspace.getConfiguration(Constants.ExtensionName).get(Constants.InvalidSection);
        if (!invalidSection)
            invalidSection = Constants.InvalidSectionDefault;
        this.invalidDecorator = vscode.window.createTextEditorDecorationType(invalidSection);

        let validSection: vscode.DecorationRenderOptions | undefined = vscode.workspace.getConfiguration(Constants.ExtensionName).get(Constants.ValidSection);
        if (!validSection)
            validSection = Constants.ValidSectionDefault;
        this.validDecorator = vscode.window.createTextEditorDecorationType(validSection);
    }

    /**
     * processActiveEditor
     */
    public async ProcessActiveEditor() {

        if (!vscode.window.activeTextEditor) {
            StatusBar.Hide();
            return;
        }
        const editor: vscode.TextEditor = vscode.window.activeTextEditor;
        const doc = editor.document;
        await this.fixDocLanguage(doc);

        const text = doc.getText();
        const fullLength = text.length;
        let lineLength = doc.lineAt(0).text.length;
        this.cumulativeValidRanges = new Array();
        this.cumulativeInvalidRanges = new Array();
        this.ClearPreviousDecorations(editor);
        if (this.rowLimit == 1) {
            let inLineMode = fullLength == lineLength;

            if (inLineMode) {
                const limit = this.charLimit;
                this.PerformInlineHighlight(editor, 0, limit, fullLength);
            }
            else {

                let usedCharacterSum = 0;
                for (let row = 0; row < doc.lineCount; row++) {
                    const lineText = doc.lineAt(row).text;
                    lineLength = lineText.length;
                    const isLastLine = row == doc.lineCount - 1;
                    if (!isLastLine)
                        lineLength += this.NewLineCount;
                    usedCharacterSum += lineLength;
                    if (this.charLimit == usedCharacterSum) {
                        this.HighlightValidCharactersInRange(editor, row, lineLength);
                    } else if (this.charLimit > usedCharacterSum) {
                        this.HighlightValidCharactersInRange(editor, row, lineLength);
                        if (isLastLine) {
                            const times = this.charLimit - usedCharacterSum;
                            this.DrawValidPaddingInRange(editor, row, lineLength, times);
                        }
                    }
                    else {
                        // this.HighlightValidCharactersInRange(editor, row, lineLength);
                        if (this.charLimit < usedCharacterSum - lineLength) {
                            this.HighlightInvalidCharactersInRange(editor, row, 0, lineLength);
                        }
                        else {
                            const boundary = lineLength - (usedCharacterSum - this.charLimit);
                            this.HighlightValidCharactersInRange(editor, row, boundary);
                            this.HighlightInvalidCharactersInRange(editor, row, boundary, lineLength);
                        }
                    }
                }
            }
        }
        else {
            for (let rowIndex = 0; rowIndex < this.rowLimit; rowIndex++) {
                let lineLength = 0;
                if (rowIndex < doc.lineCount) {
                    const line = doc.lineAt(rowIndex);
                    lineLength = line.text.length;
                }
                this.PerformInlineHighlight(editor, rowIndex, this.charLimit, lineLength);
            }
            if (this.rowLimit < doc.lineCount)
                for (let rowIndex = this.rowLimit; rowIndex < doc.lineCount; rowIndex++) {
                    let lineLength = 0;
                    if (rowIndex < doc.lineCount) {
                        const line = doc.lineAt(rowIndex);
                        lineLength = line.text.length;
                    }
                    this.HighlightInvalidCharactersInRange(editor, rowIndex, 0, lineLength);
                }
        }
    }
    private ClearPreviousDecorations(editor: vscode.TextEditor) {
        editor.setDecorations(this.validDecorator!, []);
        editor.setDecorations(this.invalidDecorator!, []);
    }

    private PerformInlineHighlight(editor: vscode.TextEditor, row: number, limit: number, fullLength: number) {
        if (limit == fullLength) {
            this.HighlightValidCharactersInRange(editor, row, limit);
        } else if (limit > fullLength) {
            this.HighlightValidCharactersInRange(editor, row, fullLength);
            const times = limit - fullLength;
            this.DrawValidPaddingInRange(editor, row, fullLength, times);
        }
        else {
            this.HighlightValidCharactersInRange(editor, row, limit);
            this.HighlightInvalidCharactersInRange(editor, row, limit, fullLength);
        }
    }

    private HighlightInvalidCharactersInRange(editor: vscode.TextEditor, row: number, startChar: number, endChar: number) {
        const validPos = new vscode.Position(row, startChar);
        const endValidPos = new vscode.Position(row, endChar);
        const validRange = new vscode.Range(validPos, endValidPos);
        this.cumulativeInvalidRanges.push(validRange);
        editor.setDecorations(this.invalidDecorator!, this.cumulativeInvalidRanges);
    }

    private HighlightValidCharactersInRange(editor: vscode.TextEditor, row: number, col: number) {
        if (col == 0)
            return;
        const validPos = new vscode.Position(row, 0);
        const endValidPos = new vscode.Position(row, col);
        const validRange = new vscode.Range(validPos, endValidPos);
        this.cumulativeValidRanges.push({ range: validRange });
        editor.setDecorations(this.validDecorator!, this.cumulativeValidRanges);
    }

    private DrawValidPaddingInRange(editor: vscode.TextEditor, row: number, col: number, times: number) {
        const validPos = new vscode.Position(row, col);
        const endValidPos = validPos.translate(0, times);
        const validRange = new vscode.Range(validPos, endValidPos);
        const renderOptions: vscode.DecorationInstanceRenderOptions = {
            after: {
                contentText: "_".repeat(times)
            }
        };
        const decOpt: vscode.DecorationOptions = {
            range: validRange,
            renderOptions
        };
        this.cumulativeValidRanges.push(decOpt);
        editor.setDecorations(this.validDecorator!, this.cumulativeValidRanges);
    }


    public async AskForLimits() {
        try {
            const separator = '*';
            const charLimitIn = await vscode.window.showInputBox({ value: '40', valueSelection: [0, 2], placeHolder: '40 or 4*10', prompt: 'Please, specify the character limit' });
            if (!charLimitIn)
                return false;
            if (charLimitIn.includes(separator)) {
                const limits = charLimitIn.split(separator);
                if (limits.length == 2) {
                    this.rowLimit = Number(limits[0]);
                    this.charLimit = Number(limits[1]);
                    return true;
                }
                else {
                    await vscode.window.showWarningMessage('Just type row*character limit', 'ok boomer !');
                }
            } else {
                this.rowLimit = 1;
                this.charLimit = Number(charLimitIn);
                return true;
            }
        } catch (err) {
            vscode.window.showErrorMessage('An error has occurred while setting the char limits:  ' + err);
        }
        return false;
    }

    public CleanUp() {
        const editor = vscode.window.activeTextEditor;
        if (editor != null && editor.document.uri == this.activeEditorUri)
            this.ClearPreviousDecorations(editor);
        this.activeEditorUri = undefined;
        this.active = false;
    }

    public CheckFont() {
        const item = vscode.workspace.getConfiguration().get(Constants.SettingsSectionKey);
        if (item == null) {
            this.ResetConfig();
        }
    }

    public async ResetConfig() {
        const key: string = Constants.SettingsSectionKey;
        vscode.workspace.getConfiguration().update(key, {
            "editor.fontFamily": "'Courier New', monospace",
            "editor.fontLigatures": false,
            "editor.fontSize": 18
        }, true);
        const section = vscode.workspace.getConfiguration(Constants.ExtensionName);
        try {
            await section.update(Constants.ValidSection, Constants.ValidSectionDefault, true);
            await section.update(Constants.InvalidSection, Constants.InvalidSectionDefault, true);
        } catch (err) {
            vscode.window.showErrorMessage('An error has occurred while updating configuration:  ' + err);
        }
    }


    private async fixDocLanguage(doc: vscode.TextDocument) {
        const lang = Constants.ExtensionName;
        if (doc.languageId != lang)
            await vscode.languages.setTextDocumentLanguage(doc, lang);
    }

    public ChangeNewLineCountValue() {
        return vscode.window.showInputBox({
            value: this.NewLineCount.toString(), placeHolder: 'Specify the value', prompt: 'Specify how count the new line (0 to ignore) ', validateInput: (value) => {
                const numVal = Number(value);
                if (numVal == NaN) {
                    return 'It should be a number';
                }
                return null;
            }
        }).then((value) => {
            if (!value)
                return;
            const numVal = Number(value);
            this.NewLineCount = numVal;
            return this.ReloadData();
        });
    }


    public async FillPaddingWith() {
        const self = this;
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor)
            return;
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = "Fill the remaining padding with";
        quickPick.items = [
            ...self._items,
            new PaddingFillerItem("or just type something", 7)
        ];
        quickPick.onDidAccept((rawTarget) => {
            const target = (quickPick.selectedItems[0]) as PaddingFillerItem;
            const itemList = quickPick.items;
            const itemListCount = itemList.length;
            for (let i = 0; i < itemListCount; i++) {
                const item = itemList[i] as PaddingFillerItem;
                if (item.id != target.id)
                    continue;
                let sequence = item.label;
                if (item.id == 5) {
                    sequence = 'abcdefghijklmnopqrstuvwxyz';
                } else if (item.id == 6) {
                    sequence = '1234567890';
                }
                const sequenceEnd = sequence.length;
                let sequenceIndex = 0;
                let resultingText = textEditor.document.getText();
                if (self.rowLimit == 1) {
                    if (self.charLimit >= sequenceEnd) {
                        const charLimit = self.charLimit - resultingText.length;
                        const times = (charLimit / sequenceEnd);
                        const plus = (charLimit % sequenceEnd);
                        if (times > 0)
                            resultingText += sequence.repeat(times);
                        for (let charIndex = 0; charIndex < plus; charIndex++) {
                            resultingText += sequence[sequenceIndex];
                            if (sequenceIndex++ < sequenceEnd)
                                sequenceIndex = 0;
                        }
                    }
                    else {
                        while (resultingText.length < self.charLimit) {
                            resultingText += sequence[sequenceIndex];
                            if (sequenceIndex++ < sequenceEnd)
                                sequenceIndex = 0;
                        }
                    }
                }
                else {
                    resultingText = '';
                    const doc = textEditor.document;
                    for (let row = 0; row < doc.lineCount; row++) {
                        let line = doc.lineAt(row).text;
                        if (self.charLimit >= sequenceEnd) {

                            const charLimit = self.charLimit - line.length;
                            const times = (charLimit / sequenceEnd);
                            const plus = (charLimit % sequenceEnd);
                            if (times > 0)
                                line += sequence.repeat(times);
                            for (let charIndex = 0; charIndex < plus; charIndex++) {
                                line += sequence[sequenceIndex];
                                if (sequenceIndex++ < sequenceEnd)
                                    sequenceIndex = 0;
                            }
                        }
                        else {
                            while (line.length < self.charLimit) {
                                line += sequence[sequenceIndex];
                                if (sequenceIndex++ < sequenceEnd)
                                    sequenceIndex = 0;
                            }
                        }
                        resultingText += line + textEditor.document.eol;
                    }
                }

                textEditor.edit((builder) => {
                    const startPosition = new vscode.Position(0, 0);
                    const endPosition = textEditor.document.positionAt(textEditor.document.getText().length);
                    builder.delete(new vscode.Range(startPosition, endPosition));
                    builder.insert(startPosition, resultingText);
                }).then((r) => {
                    quickPick.hide();
                });
                break;
            }
        });
        quickPick.onDidChangeValue((e) => {
            quickPick.items = [...self._items, new PaddingFillerItem(e, 7)]
        });
        quickPick.show();
    }
}