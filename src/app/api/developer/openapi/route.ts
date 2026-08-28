import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { generateOpenAPISpec } from '@/lib/developer/api-registry'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'

// GET /api/developer/openapi — Generate OpenAPI specification
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') ?? 'json'
    const version = searchParams.get('version') ?? 'v1'

    const spec = await generateOpenAPISpec(version)

    if (format === 'yaml') {
      return new NextResponse(JSON.stringify(spec), {
        headers: {
          'Content-Type': 'text/yaml',
          'Content-Disposition': `attachment; filename="openapi-${version}.yaml"`,
        },
      })
    }

    return NextResponse.json(spec)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate OpenAPI spec', details: String(error) },
      { status: 500 }
    )
  }
}
