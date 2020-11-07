import * as vscode from 'vscode';
import { CharacterGuidelines } from './characterGuidelines';
import { Constants, Tooltips } from './constants';
export class StatusBar {
    private static statusBarItem: vscode.StatusBarItem;
    private static guidelines: CharacterGuidelines;
    public static InitializeStatusBar(guidelines: CharacterGuidelines) {
        this.guidelines = guidelines;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        this.statusBarItem.command = Constants.ChangeNewLineCountValueCommand;
        this.statusBarItem.tooltip = Tooltips.ChangeTip;
        this.Update();
    }

    public static Display(message: string) {
        this.statusBarItem.text = message;
        this.statusBarItem.show();
    }

    public static Update() {
        this.Display('New Line Count:' + this.guidelines.NewLineCount);
    }

    public static Hide() {
        this.statusBarItem.hide();
    }

}