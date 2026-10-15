import { cache } from 'react';
import { prisma } from '@/lib/prisma';

/**
 * The public facts a hotel's layout needs for its page title, link preview
 * and first paint. Same visibility rule as GET /api/properties/[id] (active
 * properties only). Never throws: on any error the page falls back to its
 * client-side loading and error states.
 */
export const getPropertyMeta = cache(async (id: string) => {
  try {
    return await prisma.property.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        tagline: true,
        description: true,
        type: true,
        city: true,
        state: true,
        primaryColor: true,
        isDemo: true,
        photos: { orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }], take: 1, select: { url: true } },
      },
    });
  } catch {
    return null;
  }
});
