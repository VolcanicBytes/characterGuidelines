import * as vscode from 'vscode';
import { CharacterGuidelines } from './characterGuidelines';
import { Constants } from './constants';
import { StatusBar } from './statusbarProxy';

const guidelines = new CharacterGuidelines();
export function activate(context: vscode.ExtensionContext) {

	StatusBar.InitializeStatusBar(guidelines);
	guidelines.ReloadData();
	guidelines.CheckFont();
	context.subscriptions.push(

		vscode.commands.registerCommand('character-guidelines.reset-config', async () => {
			guidelines.ResetConfig();
		}),
		vscode.commands.registerCommand('character-guidelines.activate', async () => {

			if (!vscode.window.activeTextEditor)
				return;

			vscode.commands.executeCommand('setContext', Constants.Context, true);
			vscode.window.showInformationMessage('Character GuideLines!');
			guidelines.activeEditorUri = vscode.window.activeTextEditor.document.uri;
			guidelines.active = await guidelines.AskForLimits();
			guidelines.ReloadData();
			StatusBar.Update();
		}),
		vscode.commands.registerCommand('character-guidelines.deactivate', async () => {
			clear(guidelines);
		}),
		vscode.commands.registerCommand(Constants.ChangeNewLineCountValueCommand, async () => {
			await guidelines.ChangeNewLineCountValue();
			StatusBar.Update();
		}),
		vscode.commands.registerCommand(Constants.FillPaddingWithCommand, async () => {
			guidelines.FillPaddingWith();
		}),
		vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
			if (!e.affectsConfiguration(Constants.ExtensionName)) {
				return;
			}
			guidelines.ReloadDecorators();
		}),
		vscode.window.onDidChangeActiveTextEditor((e) => {
			guidelines.ReloadData();
		}),
		vscode.workspace.onDidChangeTextDocument((e) => {
			guidelines.ReloadData();
		}));
}

function clear(guidelines: CharacterGuidelines) {
	guidelines.CleanUp();
	StatusBar.Hide();
	vscode.commands.executeCommand('setContext', Constants.Context, false);
}

export function deactivate() {
	clear(guidelines);
}
