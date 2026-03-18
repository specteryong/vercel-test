import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 处理 CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get('date');

  try {
    // GET - 获取所有日记或指定日期的日记
    if (req.method === 'GET') {
      let diaries = await kv.get('diaries');
      diaries = diaries || {};

      if (date) {
        // 获取指定日期
        const diary = diaries[date] || null;
        return new Response(JSON.stringify(diary), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else {
        // 获取所有
        return new Response(JSON.stringify(diaries), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // POST - 保存日记
    if (req.method === 'POST') {
      const body = await req.json();
      const { date: postDate, content } = body;

      if (!postDate || !content) {
        return new Response(JSON.stringify({ error: '缺少必要参数' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      let diaries = await kv.get('diaries');
      diaries = diaries || {};

      diaries[postDate] = {
        content,
        updatedAt: new Date().toISOString(),
      };

      await kv.set('diaries', diaries);

      return new Response(JSON.stringify({ success: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // DELETE - 删除日记
    if (req.method === 'DELETE') {
      const body = await req.json();
      const { date: deleteDate } = body;

      if (!deleteDate) {
        return new Response(JSON.stringify({ error: '缺少日期参数' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      let diaries = await kv.get('diaries');
      diaries = diaries || {};
      delete diaries[deleteDate];
      await kv.set('diaries', diaries);

      return new Response(JSON.stringify({ success: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 不支持的方法
    return new Response(JSON.stringify({ error: '不支持的方法' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('API 错误:', error);
    return new Response(JSON.stringify({ error: '服务器错误', message: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
