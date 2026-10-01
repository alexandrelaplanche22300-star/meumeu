$v="C:\Users\alexa\Downloads\oberkommando der meumeu OKM\oberkommando-v12.0"
$sp="C:\Users\alexa\AppData\Local\Temp\claude\C--Users-alexa-Downloads-oberkommando-der-meumeu-OKM\14f7cf20-7814-4c1e-a300-00a306e42acf\scratchpad"
Set-Location "$v\jeu"; $env:ELECTRON_RUN_AS_NODE=1
New-Item -ItemType Directory -Force "$sp\reg" | Out-Null
$tests='depart_etabli','fusees','mobilisation','caserne_pieces','servants','rechargement','ravitaillement','ravitaillement_strict','ravitaillement_camp','economie','expansion','recrutement','garnison','ia','ia_tombee','beee_reel','beee_vivants','bouclier','balistique_blessure','ordres','perf','saccades','combat','armee','sabotage','nourriture','assaut'
$queue=[System.Collections.Queue]::new(); foreach($t in $tests){$queue.Enqueue($t)}
$run=@{}
$res=@()
while($queue.Count -gt 0 -or $run.Count -gt 0){
  while($run.Count -lt 6 -and $queue.Count -gt 0){$t=$queue.Dequeue();$p=Start-Process "$v\.runtime\electron.exe" -ArgumentList "test\$t.mjs" -PassThru -NoNewWindow -RedirectStandardOutput "$sp\reg\$t.log" -RedirectStandardError "$sp\reg\$t.err";$run[$t]=@{p=$p;t0=Get-Date}}
  foreach($t in @($run.Keys)){$r=$run[$t];$el=((Get-Date)-$r.t0).TotalSeconds
    if($r.p.HasExited -or $el -gt 540){if(-not $r.p.HasExited){Stop-Process -Id $r.p.Id -Force -ErrorAction SilentlyContinue;$cut=' (coupé à 540 s)'}else{$cut=''}
      Start-Sleep -Milliseconds 300
      $txt=[IO.File]::ReadAllText("$sp\reg\$t.log",[Text.Encoding]::UTF8)
      $pa=([regex]::Matches($txt,'(?m)^\s*(PASS|OK|✓)')).Count;$fa=([regex]::Matches($txt,'(?m)^\s*(FAIL|ÉCHEC|✗)')).Count
      $err=(Get-Content "$sp\reg\$t.err" | Select-String -NotMatch 'Reparsing|MODULE_TYPELESS|type.*module|trace-warnings|^\s*$' | Select-Object -First 1)
      $res+="$t : $pa PASS / $fa FAIL$cut $(if($err){'| ERR '+$err.Line.Substring(0,[Math]::Min(120,$err.Line.Length))})"
      $run.Remove($t)}}
  Start-Sleep -Seconds 3}
$res | Set-Content "$sp\reg\_bilan.txt" -Encoding utf8
