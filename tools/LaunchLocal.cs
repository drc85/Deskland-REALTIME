// Living Desktop local test launcher. GPL-3.0.
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
static class LaunchLocal
{
    [STAThread]static void Main(string[] args)
    {
        string root=AppDomain.CurrentDomain.BaseDirectory;
        string exe=Path.Combine(root,@"Projekt\host\bin\Deskland.exe");
        if(!File.Exists(exe)){MessageBox.Show("Die Anwendungsdateien fehlen. Bitte den vollständigen Living-Desktop-Ordner verwenden.","Living Desktop");return;}
        var start=new ProcessStartInfo(exe);
        start.UseShellExecute=false;start.CreateNoWindow=true;start.WorkingDirectory=Path.GetDirectoryName(exe);
        start.EnvironmentVariables["DESKLAND_PROFILE_DIR"]=Path.Combine(root,"Daten");
        // Debugging is restricted to the development test instance.
        start.EnvironmentVariables.Remove("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS");
        if(args.Length==1 && args[0]=="--exit")start.Arguments="--exit";
        try{Process.Start(start);}catch(Exception ex){MessageBox.Show(ex.Message,"Living Desktop");}
    }
}
