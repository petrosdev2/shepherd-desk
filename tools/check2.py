import json, asyncio
from playwright.async_api import async_playwright
seed = open('seed/local.json').read()
html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + open('shepherd-desk.html').read() + '</body></html>'
open('build/test.html','w').write(html)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width':1360,'height':900})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(f"localStorage.setItem('shepherd-desk-local-v1', {json.dumps(seed)});")
        await pg.goto('file:///home/claude/shepherd-desk/build/test.html'); await pg.wait_for_timeout(400)
        await pg.evaluate("S.route='members'; S.role='admin'; render()")
        n0 = await pg.evaluate("Object.keys(D.members).length")
        # edit via row button
        await pg.click('button[data-act=editMember][data-id="ex-m-15"]'); await pg.fill('#f-occ','Pharmacist'); await pg.click('button[data-act=submitModal]'); await pg.wait_for_timeout(200)
        occ = await pg.evaluate("D.members['ex-m-15'].occupation")
        # single delete via row button
        await pg.click('button[data-act=deleteMember][data-id="ex-m-33"]'); await pg.click('button[data-act=confirmYes]'); await pg.wait_for_timeout(200)
        # select two and bulk delete
        await pg.click('td.sel-cell[data-id="ex-m-30"] input'); await pg.click('td.sel-cell[data-id="ex-m-31"]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path='shots/members-sel.png')
        await pg.click('button[data-act=bulkDelete]'); await pg.click('button[data-act=confirmYes]'); await pg.wait_for_timeout(300)
        n1 = await pg.evaluate("Object.keys(D.members).length")
        # select all then clear
        await pg.click('th.sel-cell input'); sel = await pg.evaluate("S.sel.size"); await pg.click('button[data-act=clearSel]')
        # row click still opens profile
        await pg.click('tr[data-id="ex-m-15"] td:nth-child(3)'); modal = await pg.evaluate("!document.getElementById('modal-root').hidden")
        print('occupation', occ, 'members', n0, '->', n1, 'selectAll', sel, 'profile opens', modal, 'errors', errs)
        await b.close()
asyncio.run(main())
