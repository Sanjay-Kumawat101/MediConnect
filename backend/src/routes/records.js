import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { supabase } from '../lib/supabase.js';

const router = Router();
const storageBucket = 'medical-records';

async function addSignedUrl(record) {
  const { data, error } = await supabase.storage
    .from(storageBucket)
    .createSignedUrl(record.file_path, 300);
  if (error) throw error;
  return { ...record, signed_url: data.signedUrl, public_url: null };
}

// Multer storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    allowed.includes(file.mimetype) ? cb(null, true) :
      cb(new Error('Invalid file type.'), false);
  }
});

// Get all records for current user
router.get('/', async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch records' });
  try {
    res.json(await Promise.all((data || []).map(addSignedUrl)));
  } catch (signError) {
    console.error('Medical-record link signing failed:', signError);
    res.status(500).json({ error: 'Failed to prepare secure medical-record links' });
  }
});

// Upload new record
router.post('/upload', upload.single('file'), async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { title, type, description, doctorName, recordDate } = req.body;
  if (!title || !type) return res.status(400).json({ error: 'Title/type required' });

  try {
    const ext = path.extname(req.file.originalname);
    const fileName = `rec_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;

    // Upload buffer to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from(storageBucket)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (storageError) {
      return res.status(500).json({ error: 'Failed to upload to storage: ' + storageError.message });
    }

    const file_path = storageData.path;
    const { data: signedData, error: signedUrlError } = await supabase.storage
      .from(storageBucket)
      .createSignedUrl(file_path, 300);
    if (signedUrlError) {
      await supabase.storage.from(storageBucket).remove([file_path]);
      console.error('Medical-record link signing failed:', signedUrlError);
      return res.status(500).json({ error: 'Failed to prepare a secure medical-record link' });
    }

    const { data, error } = await supabase
      .from('medical_records')
      .insert({
        user_id: userId,
        title: title.trim(),
        type,
        description: description || '',
        doctor_name: doctorName || '',
        record_date: recordDate || null,
        file_name: fileName,
        file_path,
        public_url: null,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        original_name: req.file.originalname
      })
      .select()
      .single();

    if (error) {
      await supabase.storage.from(storageBucket).remove([file_path]);
      return res.status(500).json({ error: 'Failed to save record.' });
    }

    res.status(201).json({ ...data, signed_url: signedData.signedUrl });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// Download/view specific record file
router.get('/:id', async (req, res) => {
  const userId = req.user?.sub;
  const { id } = req.params;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return res.status(404).json({ error: 'Record not found' });

  try {
    res.json(await addSignedUrl(data));
  } catch (signError) {
    console.error('Medical-record link signing failed:', signError);
    res.status(500).json({ error: 'Failed to prepare a secure medical-record link' });
  }
});

// Delete record (and file)
router.delete('/:id', async (req, res) => {
  const userId = req.user?.sub;
  const { id } = req.params;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { data: record, error: fetchError } = await supabase
    .from('medical_records')
    .select('file_path')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) return res.status(500).json({ error: 'Failed to fetch record' });
  if (!record) return res.status(404).json({ error: 'Record not found' });

  const { error } = await supabase
    .from('medical_records')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: 'Failed to delete record' });

  // Delete the private storage object after removing its database record.
  if (record.file_path) {
    const { error: storageError } = await supabase.storage
      .from(storageBucket)
      .remove([record.file_path]);
    if (storageError) {
      console.error('Medical-record storage deletion failed:', storageError);
      return res.status(500).json({ error: 'Record deleted, but its stored file could not be removed' });
    }
  }

  res.status(204).send();
});

export default router;
