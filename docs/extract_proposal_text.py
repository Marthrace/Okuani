import zipfile, re, sys
z = zipfile.ZipFile(r'OKUANI_Project_Proposal (1).docx')
xml = z.read('word/document.xml').decode('utf-8', 'ignore')
texts = re.findall(r'<w:t[^>]*>(.*?)</w:t>', xml)
sys.stdout.write('\n'.join(texts[:12000]))
