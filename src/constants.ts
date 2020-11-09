import * as vscode from "vscode";
export class Constants {

    public static Context: string = "CharacterGuidelinesActive";
    public static ExtensionName: string = "character-guidelines";
    public static ValidSection: string = "valid-section";
    public static FillPaddingWithCommand: string = "character-guidelines.fill-padding-with";
    public static ChangeNewLineCountValueCommand: string = "character-guidelines.change-new-line-count-value";
    public static ValidSectionDefault: vscode.DecorationRenderOptions = {
        color: 'green',
        backgroundColor: 'black',
        after: {
            color: 'green',
            backgroundColor: 'black',
        }
    };

    public static InvalidSection: string = "invalid-section";
    public static InvalidSectionDefault: vscode.DecorationRenderOptions = {
        color: 'red',
        backgroundColor: 'darkred',
        after: {
            color: 'red',
            backgroundColor: 'darkred',
        }
    };

    public static SettingsSectionKey = `[${Constants.ExtensionName}]`;
}

export class Tooltips {
    public static readonly ChangeTip = 'Click to change';
}