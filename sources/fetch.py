import sys,urllib.parse,urllib.request,time,os,re,html
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
def strip(s):
    s=re.sub(r'(?s)<(script|style)[^>]*>.*?</\1>','',s)
    s=re.sub(r'<br\s*/?>|</(div|p|li|h\d|tr|td)>','\n',s)
    s=re.sub(r'<[^>]+>','',s); s=html.unescape(s)
    s=re.sub(r'\n\s*\n+','\n',s)
    i=s.find('1. 개요'); j=s.find('이 저작물은 CC')
    return s[i if i>0 else 0: j if j>0 else None]
for name in open(sys.argv[1],encoding='utf-8').read().split('\n'):
    name=name.strip()
    if not name: continue
    fn='namu/'+re.sub(r'[\/:*?"<>|]','_',name)+'.txt'
    if os.path.exists(fn): continue
    url='https://namu.wiki/w/'+urllib.parse.quote(name)
    try:
        r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=30)
        t=strip(r.read().decode('utf-8','ignore'))
        open(fn,'w',encoding='utf-8').write(t); print('OK',len(t),name)
    except Exception as e: print('ERR',name,e)
    time.sleep(1.2)
