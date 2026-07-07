import { NextResponse } from 'next/server';
import { fetchLiveMatchResults } from '@/lib/football-data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const competitionCode = searchParams.get('competition') || 'WC';
    const revalidateSeconds = parseInt(searchParams.get('revalidate') || '60', 10);

    const matches = await fetchLiveMatchResults(competitionCode, {
      revalidateSeconds,
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Error fetching live matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live matches' },
      { status: 500 }
    );
  }
}
