import { type FC, useMemo } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import { toast } from '@/components/toast'
import { type AdminLesson, type ArticleContentBlock } from './admin-data'

type Props = { lesson: AdminLesson; onChange: (lesson: AdminLesson) => void; readImage: (file: File) => Promise<string> }

const blocksFromLesson = (lesson: AdminLesson): ArticleContentBlock[] => lesson.articleBlocks ?? (lesson.articleBody ?? '').split(/\n+/).filter(Boolean).map((text) => {
  const heading = text.match(/^(?:#{1,6}\s+|\d+[.)]\s+)(.+)$/)
  return heading ? { type: 'heading', text: heading[1] } : { type: 'text', text }
})

const ArticleBlockEditor: FC<Props> = ({ lesson, onChange, readImage }) => {
  const blocks = useMemo(() => blocksFromLesson(lesson), [lesson.articleBlocks, lesson.articleBody])
  const setBlocks = (next: ArticleContentBlock[]) => onChange({ ...lesson, articleBlocks: next, articleBody: next.filter((block) => block.type !== 'image').map((block) => block.text).join('\n') })
  const insertBlock = (index: number, block: ArticleContentBlock) => setBlocks([...blocks.slice(0, index), block, ...blocks.slice(index)])
  const updateBlock = (index: number, update: Partial<ArticleContentBlock>) => setBlocks(blocks.map((block, blockIndex) => blockIndex === index ? { ...block, ...update } as ArticleContentBlock : block))
  const removeBlock = (index: number) => setBlocks(blocks.filter((_, blockIndex) => blockIndex !== index))
  const uploadImage = async (index: number, file: File) => {
    try {
      const imageUrl = await readImage(file)
      updateBlock(index, { imageUrl })
    } catch (error) {
      toast.add({ title: 'Unable to add image', description: error instanceof Error ? error.message : 'This image could not be read.', type: 'error' })
    }
  }
  const uploadHeaderImage = async (file: File) => {
    try {
      onChange({ ...lesson, articleHeaderImageUrl: await readImage(file) })
    } catch (error) {
      toast.add({ title: 'Unable to add header image', description: error instanceof Error ? error.message : 'This image could not be read.', type: 'error' })
    }
  }

  return <Stack spacing={1.5}>
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        {lesson.articleHeaderImageUrl && <Box component="img" src={lesson.articleHeaderImageUrl} alt="Article header preview" sx={{ width: { xs: '100%', sm: 180 }, height: 90, objectFit: 'cover', borderRadius: 1 }} />}
        <Box sx={{ flex: 1 }}><Typography variant="body2" sx={{ fontWeight: 700 }}>Optional header image</Typography><Typography variant="caption" color="text.secondary">Appears above the lesson title and is separate from inline images.</Typography></Box>
        <Stack direction="row" spacing={0.75}><Button component="label" size="small" variant="outlined" startIcon={<AddPhotoAlternateOutlinedIcon />}>{lesson.articleHeaderImageUrl ? 'Replace header image' : 'Add header image'}<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const [file] = Array.from(event.target.files ?? []); if (file) void uploadHeaderImage(file); event.target.value = '' }} /></Button>{lesson.articleHeaderImageUrl && <IconButton size="small" color="error" onClick={() => onChange({ ...lesson, articleHeaderImageUrl: undefined })} aria-label="Remove header image"><DeleteOutlineIcon fontSize="small" /></IconButton>}</Stack>
      </Stack>
    </Paper>
    <Typography variant="body2" color="text.secondary">Build the article in order. Add an image between any paragraphs and include a caption if useful.</Typography>
    {blocks.map((block, index) => <Paper key={`article-block-${index}`} variant="outlined" sx={{ p: 1.25 }}>
      {block.type === 'image' ? <Stack spacing={1}><Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" spacing={0.75} alignItems="center"><ImageOutlinedIcon color="primary" fontSize="small" /><Typography variant="body2" sx={{ fontWeight: 700 }}>Inline image</Typography></Stack><IconButton size="small" color="error" onClick={() => removeBlock(index)} aria-label="Remove inline image"><DeleteOutlineIcon fontSize="small" /></IconButton></Stack>{block.imageUrl ? <Box component="img" src={block.imageUrl} alt={block.caption || 'Article image preview'} sx={{ display: 'block', width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 1, backgroundColor: 'action.hover' }} /> : <Alert severity="info">Upload an image for this position. An empty image block is not shown to learners.</Alert>}<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><TextField fullWidth size="small" label="Optional caption" value={block.caption} onChange={(event) => updateBlock(index, { caption: event.target.value })} /><Button component="label" size="small" variant="outlined" startIcon={<AddPhotoAlternateOutlinedIcon />}>{block.imageUrl ? 'Replace image' : 'Upload image'}<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const [file] = Array.from(event.target.files ?? []); if (file) void uploadImage(index, file); event.target.value = '' }} /></Button></Stack></Stack> : <Stack direction="row" spacing={1} alignItems="flex-start"><TextFieldsIcon color="action" sx={{ mt: 1 }} /><TextField fullWidth multiline={block.type === 'text'} minRows={block.type === 'text' ? 2 : undefined} size="small" label={block.type === 'heading' ? 'Section heading' : 'Paragraph'} value={block.text} onChange={(event) => updateBlock(index, { text: event.target.value })} /><IconButton size="small" color="error" onClick={() => removeBlock(index)} aria-label={`Remove ${block.type === 'heading' ? 'heading' : 'paragraph'}`}><DeleteOutlineIcon fontSize="small" /></IconButton></Stack>}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}><Button size="small" onClick={() => insertBlock(index, { type: 'text', text: '' })}>Add paragraph above</Button><Button size="small" startIcon={<ImageOutlinedIcon />} onClick={() => insertBlock(index, { type: 'image', caption: '' })}>Add image above</Button><Button size="small" onClick={() => insertBlock(index + 1, { type: 'text', text: '' })}>Add paragraph below</Button><Button size="small" startIcon={<ImageOutlinedIcon />} onClick={() => insertBlock(index + 1, { type: 'image', caption: '' })}>Add image below</Button></Stack>
    </Paper>)}
    <Stack direction="row" spacing={1} flexWrap="wrap"><Button variant="outlined" size="small" onClick={() => insertBlock(blocks.length, { type: 'text', text: '' })}>Add paragraph</Button><Button variant="outlined" size="small" onClick={() => insertBlock(blocks.length, { type: 'heading', text: '' })}>Add section heading</Button><Button variant="outlined" size="small" startIcon={<ImageOutlinedIcon />} onClick={() => insertBlock(blocks.length, { type: 'image', caption: '' })}>Add inline image</Button></Stack>
  </Stack>
}

export default ArticleBlockEditor
