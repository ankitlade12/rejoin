import json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1];out=root/'artifacts/product';scenes=json.loads((root/'scripts/product-scenes.json').read_text());total=0
for scene in scenes:
 path=out/(scene['id']+'.aiff');subprocess.run(['say','-v','Aman (English (India))','-r','165','-o',str(path),scene['text']],check=True)
 data=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_format','-of','json',str(path)],text=True));scene['audio']=str(path);scene['duration']=float(data['format']['duration']);total+=scene['duration']
(out/'narration.json').write_text(json.dumps(scenes,indent=2));print(f'Indian English male narration generated: {total:.1f} seconds across {len(scenes)} chapters. No subtitles.')
