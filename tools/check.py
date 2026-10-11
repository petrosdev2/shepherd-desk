import json, asyncio
from playwright.async_api import async_playwright
seed = open('seed/local.json').read()
html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + open('shepherd-desk.html').read() + '</body></html>'
open('build/test.html','w').write(html)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errs = []
        for name, vp in [('desk', {'width':1360,'height':900}), ('phone', {'width':400,'height':860})]:
            pg = await b.new_page(viewport=vp)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
            await pg.add_init_script(f"localStorage.setItem('shepherd-desk-local-v1', {json.dumps(seed)});")
            await pg.goto('file:///home/claude/shepherd-desk/build/test.html')
            await pg.wait_for_timeout(600)
            routes = ['dashboard','members','attendance','followup','giving','comms','children','reports','settings'] if name=='desk' else ['dashboard']
            for r in routes:
                await pg.evaluate(f"S.route='{r}'; render()")
                await pg.wait_for_timeout(150)
                await pg.screenshot(path=f'shots/{name}-{r}.png', full_page=True)
            if name=='desk':
                for t in ['income','expenses','counts']:
                    await pg.evaluate(f"S.route='giving'; S.gTab='{t}'; render()")
                # open a few modals
                await pg.evaluate("S.route='attendance'; render(); serviceForm()"); await pg.wait_for_timeout(100); await pg.screenshot(path='shots/m-att.png')
                await pg.evaluate("closeModal(); showMember('ex-m-03')"); await pg.wait_for_timeout(100); await pg.screenshot(path='shots/m-mem.png')
                await pg.evaluate("closeModal(); countForm(Object.keys(D.counts)[1])" ) 
                await pg.evaluate("closeModal(); ftModal('ex-f-2')"); await pg.evaluate("closeModal(); checkInForm()"); await pg.evaluate("closeModal(); memberForm('ex-m-03')")
                await pg.evaluate("closeModal(); ST(); A.switchPlan({dataset:{plan:'network'}})"); await pg.evaluate("A.confirmYes()"); await pg.wait_for_timeout(400)
                await pg.evaluate("closeModal(); S.route='branches'; render()"); await pg.wait_for_timeout(100); await pg.screenshot(path='shots/desk-branches.png', full_page=True)
                await pg.evaluate("S.route='dashboard'; render()"); await pg.screenshot(path='shots/desk-dash-multi.png')
            await pg.close()
        # fresh setup
        pg = await b.new_page(viewport={'width':1200,'height':900}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/shepherd-desk/build/test.html'); await pg.wait_for_timeout(300); await pg.screenshot(path='shots/setup.png')
        await b.close()
        print('ERRORS:', errs)
asyncio.run(main())
