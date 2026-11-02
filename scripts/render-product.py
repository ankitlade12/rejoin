import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/product'
def run(args):
 r=subprocess.run(args,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 if r.returncode:raise RuntimeError(r.stderr.decode()[-2500:])
data=json.loads((OUT/'timeline.json').read_text());assert len(data['scenes'])==11,'Capture incomplete; do not publish a partial walkthrough.'
clips=[]
for i,scene in enumerate(data['scenes']):
 clip=OUT/f'scene-{i:02}.mp4';duration=scene['duration'];run(['ffmpeg','-y','-ss',str(scene['start']),'-i',data['videos'][scene['source']],'-i',scene['audio'],'-filter_complex','[0:v]scale=1728:1080:flags=lanczos,pad=1920:1080:96:0:color=0x0e0c13,fps=30,setsar=1[v];[1:a]apad,loudnorm=I=-16:TP=-1.5:LRA=11[a]','-map','[v]','-map','[a]','-t',str(duration),'-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-b:a','160k',str(clip)]);clips.append(clip);print('Rendered '+scene['id'],flush=True)
listing=OUT/'concat.txt';listing.write_text('\n'.join("file '"+str(c)+"'" for c in clips)+'\n');destination=ROOT/'artifacts/rejoin-product-demo.mp4'
run(['ffmpeg','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart',str(destination)])
probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_format','-show_streams','-of','json',str(destination)],text=True));duration=float(probe['format']['duration']);assert duration<180,f'Needs editing: {duration} seconds';assert any(s['codec_type']=='audio' for s in probe['streams']);assert not any(s['codec_type']=='subtitle' for s in probe['streams']);(OUT/'final-probe.json').write_text(json.dumps(probe,indent=2));print(f'COMPLETE: {duration:.1f} seconds; Indian English male narration; no subtitles. {destination}')
