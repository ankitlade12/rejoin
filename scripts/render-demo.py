import json,subprocess,textwrap
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1];out=root/'artifacts';data=json.loads((out/'recording.json').read_text());trim=data['trimStart'];end=data['end'];marks=[m for m in data['captions'] if m['at']>=trim]
def stamp(t):
 ms=round(max(t,0)*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000);return f'{h:02}:{m:02}:{s:02},{ms:03}'
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',28);lines=[];concat=[]
for i,mark in enumerate(marks):
 finish=marks[i+1]['at'] if i+1<len(marks) else end;caption='\n'.join(textwrap.wrap(mark['text'],96));lines.append(f'{i+1}\n{stamp(mark["at"]-trim)} --> {stamp(finish-trim)}\n'+caption+'\n')
 frame=Image.new('RGBA',(1600,1000));draw=ImageDraw.Draw(frame);box=draw.multiline_textbbox((0,0),caption,font=font,spacing=9,align='center');height=box[3]-box[1];draw.rounded_rectangle((30,960-height-35,1570,985),radius=14,fill=(17,12,24,240));draw.multiline_text(((1600-(box[2]-box[0]))/2,960-height-15),caption,font=font,fill='white',spacing=9,align='center');path=out/f'caption-{i:02}.png';frame.save(path);concat.extend([f"file '{path}'",f'duration {finish-mark["at"]:.6f}'])
concat.append(f"file '{path}'");(out/'captions.txt').write_text('\n'.join(concat)+'\n');(out/'demo-captions.srt').write_text('\n'.join(lines))
command=['ffmpeg','-y','-ss',str(trim),'-i',data['raw'],'-f','concat','-safe','0','-i',str(out/'captions.txt'),'-filter_complex','[0:v][1:v]overlay=shortest=1[v]','-map','[v]','-t',str(end-trim),'-r','30','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(out/'rejoin-demo.mp4')]
r=subprocess.run(command,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
if r.returncode:raise RuntimeError(r.stderr.decode()[-2000:])
probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_format','-of','json',str(out/'rejoin-demo.mp4')],text=True));seconds=float(probe['format']['duration']);assert seconds<180,f'Recording is {seconds}s; edit required';print(f'Captioned demo ready: {seconds:.1f} seconds; {out/"rejoin-demo.mp4"}')
