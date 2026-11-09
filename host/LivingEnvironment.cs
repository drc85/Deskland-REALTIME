// Living Desktop environment services. GPL-3.0.
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;

static class LocationSearch
{
    static Dictionary<string,object> Get(string url)
    {
        var request=(HttpWebRequest)WebRequest.Create(url);request.Timeout=10000;request.ReadWriteTimeout=10000;
        request.UserAgent="LivingDesktopLocalTest/0.1";
        using(var response=request.GetResponse())using(var stream=response.GetResponseStream())using(var reader=new StreamReader(stream))
            return Json.Parse(reader.ReadToEnd()) as Dictionary<string,object>;
    }
    static object Postal(string query,string code)
    {
        if(code==null || !System.Text.RegularExpressions.Regex.IsMatch(code,"^[A-Z]{2}$") || !System.Text.RegularExpressions.Regex.IsMatch(query,@"\d"))return null;
        Dictionary<string,object> data;
        try {data=Get("https://api.zippopotam.us/"+code.ToLowerInvariant()+"/"+Uri.EscapeDataString(query.Trim()));}
        catch(WebException){return null;}
        object raw;if(data==null||!data.TryGetValue("places",out raw))return null;
        var places=raw as object[];if(places==null)return null;
        var result=new List<object>();
        foreach(var value in places) {
            var place=value as Dictionary<string,object>;if(place==null)continue;
            string latitude=Convert.ToString(place["latitude"],System.Globalization.CultureInfo.InvariantCulture);
            string longitude=Convert.ToString(place["longitude"],System.Globalization.CultureInfo.InvariantCulture);
            string timezone=code=="DE"?"Europe/Berlin":code=="AT"?"Europe/Vienna":code=="CH"?"Europe/Zurich":null;
            if(timezone==null) {
                var zone=Get("https://api.open-meteo.com/v1/forecast?latitude="+Uri.EscapeDataString(latitude)+"&longitude="+Uri.EscapeDataString(longitude)+"&timezone=auto");
                timezone=zone["timezone"] as string;
            }
            result.Add(Json.Obj("name",place["place name"],"admin1",place["state"],"country",data["country"],
                "latitude",double.Parse(latitude,System.Globalization.CultureInfo.InvariantCulture),"longitude",double.Parse(longitude,System.Globalization.CultureInfo.InvariantCulture),"timezone",timezone));
            if(result.Count>=5)break;
        }
        return result;
    }
    public static void Start(Dictionary<string,object> m, SettingsForm target)
    {
        object q, country, token;
        m.TryGetValue("query",out q);m.TryGetValue("country",out country);m.TryGetValue("request",out token);
        string query=q as string, code=country as string;
        if(string.IsNullOrWhiteSpace(query) || query.Length>120) return;
        query=query.Trim();code=string.IsNullOrWhiteSpace(code)?"DE":code.Trim().ToUpperInvariant();
        if(code=="DE")query=System.Text.RegularExpressions.Regex.Replace(query,@"^(?:DE|D)[-\s]*(?=\d)","",System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if(System.Text.RegularExpressions.Regex.IsMatch(query,@"^[\d\s]+$"))query=query.Replace(" ","");
        ThreadPool.QueueUserWorkItem(delegate {
            object results=null;string error=null;
            try {
                ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
                string url="https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&name="+Uri.EscapeDataString(query.Trim());
                if(code!=null && System.Text.RegularExpressions.Regex.IsMatch(code,"^[A-Z]{2}$"))url+="&countryCode="+code;
                results=Postal(query,code);
                if(results==null){var data=Get(url);if(data!=null)data.TryGetValue("results",out results);}
            } catch { error="Location search unavailable. Check the connection or enter coordinates below."; }
            string message=Json.Stringify(Json.Obj("t","locationResults","request",token,"results",results,"error",error));
            try { if(!target.IsDisposed)target.BeginInvoke((Action)delegate {if(!target.IsDisposed)target.Post(message);}); } catch(InvalidOperationException) {}
        });
    }
}

// Shell-derived alpha silhouettes, never screenshots. Labels stay in this host;
// only a black alpha PNG and its screen rectangle reach the local wallpaper.
static class DesktopMasks
{
    static readonly object gate=new object();
    static Dictionary<string,string> masks=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
    static DateTime due=DateTime.MinValue;
    static bool loading;
    public static string Find(string label)
    {
        lock(gate) {
            if(!loading && DateTime.UtcNow>=due) {
                loading=true;due=DateTime.UtcNow.AddSeconds(30);
                var worker=new Thread(Refresh);worker.IsBackground=true;worker.SetApartmentState(ApartmentState.STA);worker.Start();
            }
            string value;return label!=null && masks.TryGetValue(label,out value)?value:null;
        }
    }
    static object Call(object target,string member,params object[] args) {
        return target.GetType().InvokeMember(member,BindingFlags.InvokeMethod|BindingFlags.GetProperty,null,target,args);
    }
    static void Release(object value) {if(value!=null && Marshal.IsComObject(value))Marshal.ReleaseComObject(value);}
    static void Refresh()
    {
        var next=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
        object shell=null,folder=null,items=null;
        try {
            shell=Activator.CreateInstance(Type.GetTypeFromProgID("Shell.Application"));folder=Call(shell,"NameSpace",0);items=Call(folder,"Items");
            int count=Convert.ToInt32(Call(items,"Count"));
            for(int i=0;i<count;i++) {
                object item=null;
                try {
                    item=Call(items,"Item",i);string name=Call(item,"Name") as string,path=Call(item,"Path") as string;
                    if(string.IsNullOrEmpty(name)||string.IsNullOrEmpty(path))continue;
                    if(next.ContainsKey(name)){next[name]=null;continue;} // ambiguous display names are not guessed
                    next[name]=Extract(path);
                } catch {} finally {Release(item);}
            }
            lock(gate)masks=next;
        } catch {} finally {Release(items);Release(folder);Release(shell);lock(gate)loading=false;}
    }
    static string Extract(string path)
    {
        IntPtr pidl;uint attributes;
        if(SHParseDisplayName(path,IntPtr.Zero,out pidl,0,out attributes)!=0)return null;
        var info=new SHFILEINFO();
        try {
            if(SHGetFileInfo(pidl,0,out info,(uint)Marshal.SizeOf(typeof(SHFILEINFO)),0x100|0x8|0x20)==IntPtr.Zero || info.hIcon==IntPtr.Zero)return null;
            ICONINFO iconInfo;
            if(!GetIconInfo(info.hIcon,out iconInfo))return null;
            try {
                using(var icon=Icon.FromHandle(info.hIcon))using(var bitmap=icon.ToBitmap())using(var output=new Bitmap(bitmap.Width,bitmap.Height,PixelFormat.Format32bppArgb)) {
                    int width=bitmap.Width,height=bitmap.Height;var pixels=new byte[width*height*4];
                    var header=new BITMAPINFO {size=40,width=width,height=-height,planes=1,bits=32};
                    IntPtr dc=GetDC(IntPtr.Zero);
                    try {if(iconInfo.color!=IntPtr.Zero)GetDIBits(dc,iconInfo.color,0,(uint)height,pixels,ref header,0);}finally{ReleaseDC(IntPtr.Zero,dc);}
                    bool hasAlpha=false;for(int i=3;i<pixels.Length;i+=4)if(pixels[i]!=0){hasAlpha=true;break;}
                    using(var mask=iconInfo.mask!=IntPtr.Zero?Bitmap.FromHbitmap(iconInfo.mask):null) {
                        for(int y=0;y<height;y++)for(int x=0;x<width;x++) {
                            int alpha=hasAlpha?pixels[(y*width+x)*4+3]:(mask!=null&&mask.GetPixel(x,y).R>127?0:255);
                            output.SetPixel(x,y,Color.FromArgb(alpha,0,0,0));
                        }
                    }
                    using(var data=new MemoryStream()){output.Save(data,ImageFormat.Png);return "data:image/png;base64,"+Convert.ToBase64String(data.ToArray());}
                }
            } finally {if(iconInfo.color!=IntPtr.Zero)DeleteObject(iconInfo.color);if(iconInfo.mask!=IntPtr.Zero)DeleteObject(iconInfo.mask);}
        } finally {if(info.hIcon!=IntPtr.Zero)DestroyIcon(info.hIcon);Marshal.FreeCoTaskMem(pidl);}
    }
    [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]struct SHFILEINFO {
        public IntPtr hIcon;public int iIcon;public uint attributes;
        [MarshalAs(UnmanagedType.ByValTStr,SizeConst=260)]public string displayName;
        [MarshalAs(UnmanagedType.ByValTStr,SizeConst=80)]public string typeName;
    }
    [DllImport("shell32.dll",CharSet=CharSet.Unicode)]static extern int SHParseDisplayName(string name,IntPtr bind,out IntPtr pidl,uint mask,out uint attrs);
    [DllImport("shell32.dll",CharSet=CharSet.Unicode,EntryPoint="SHGetFileInfoW")]static extern IntPtr SHGetFileInfo(IntPtr pidl,uint attrs,out SHFILEINFO info,uint size,uint flags);
    [DllImport("user32.dll")]static extern bool DestroyIcon(IntPtr icon);
    [StructLayout(LayoutKind.Sequential)]struct ICONINFO {public bool icon;public uint x,y;public IntPtr mask,color;}
    [StructLayout(LayoutKind.Sequential)]struct BITMAPINFO {public uint size;public int width,height;public ushort planes,bits;public uint compression,imageSize;public int xppm,yppm;public uint used,important;public uint palette;}
    [DllImport("user32.dll")]static extern bool GetIconInfo(IntPtr icon,out ICONINFO info);
    [DllImport("user32.dll")]static extern IntPtr GetDC(IntPtr window);
    [DllImport("user32.dll")]static extern int ReleaseDC(IntPtr window,IntPtr dc);
    [DllImport("gdi32.dll")]static extern int GetDIBits(IntPtr dc,IntPtr bitmap,uint start,uint lines,byte[] bits,ref BITMAPINFO info,uint usage);
    [DllImport("gdi32.dll")]static extern bool DeleteObject(IntPtr value);
}
