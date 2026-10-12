import type { FC } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import type { ArticleContentBlock } from './admin-data'

type Props = { blocks: ArticleContentBlock[]; onUpload: (index: number, file: File) => void; onCaptionChange: (index: number, caption: string) => void }

const ArticleImportPreview: FC<Props> = ({ blocks, onUpload, onCaptionChange }) => <Stack spacing={1}>{blocks.map((block, index) => block.type === 'image' ? <Paper key={`image-${index}`} variant="outlined" sx={{ p: 1.5, borderStyle: block.imageUrl ? 'solid' : 'dashed' }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}><Box sx={{ flex: 1 }}>{block.imageUrl ? <Box component="img" src={block.imageUrl} alt={block.marker || 'Article inline image preview'} sx={{ display: 'block', maxWidth: '100%', maxHeight: 180, objectFit: 'contain', mb: 1 }} /> : <Alert severity="info" sx={{ mb: 1 }}>Image needed here{block.marker ? `: ${block.marker}` : ''}</Alert>}<TextField fullWidth size="small" label="Optional caption" value={block.caption} onChange={(event) => onCaptionChange(index, event.target.value)} /></Box><Button component="label" size="small" variant="outlined" startIcon={<ImageOutlinedIcon />}>{block.imageUrl ? 'Replace image' : 'Upload image'}<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const [file] = Array.from(event.target.files ?? []); if (file) onUpload(index, file); event.target.value = '' }} /></Button></Stack></Paper> : <Typography key={`text-${index}`} variant={block.type === 'heading' ? 'h6' : 'body2'} sx={{ whiteSpace: 'pre-wrap', fontWeight: block.type === 'heading' ? 700 : undefined }}>{block.text}</Typography>)}</Stack>

export default ArticleImportPreview
