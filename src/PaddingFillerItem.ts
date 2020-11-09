import * as vscode from 'vscode';

export class PaddingFillerItem implements vscode.QuickPickItem {
    description?: string | undefined;
    detail?: string | undefined;
    picked?: boolean | undefined;
    alwaysShow?: boolean | undefined;
    public id: number;
    constructor(public label: string, public idNo: number) {
        this.id = idNo;
    }
}