import { BUSINESS_QUESTION } from './constants'
import { formatStock } from './inventory'
import { formatMoney } from './money'
import type { DayResult, Weather } from './types'
import { weatherPhrase } from './weather'

export { BUSINESS_QUESTION }

export interface Brief {
  kicker: string
  text: string
}

function overnightLoss(yesterday: DayResult): string | null {
  const parts: string[] = []
  if (yesterday.iceMeltCents > 0) {
    parts.push(`${formatStock('ice', yesterday.iceMeltQty)} melted (${formatMoney(yesterday.iceMeltCents)})`)
  }
  if (yesterday.spoilLemonsCents > 0) {
    parts.push(`${formatStock('lemons', yesterday.spoilLemonsQty)} went bad (${formatMoney(yesterday.spoilLemonsCents)})`)
  }
  if (yesterday.spoilSugarCents > 0) {
    parts.push(`${formatStock('sugar', yesterday.spoilSugarQty)} went bad (${formatMoney(yesterday.spoilSugarCents)})`)
  }
  if (parts.length === 0) return null
  const list = parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  return `Overnight, ${list}. That waste is not inside cost of goods. It still destroys value.`
}

/** What customers complained about, without naming a target recipe. */
function recipeComplaint(yesterday: DayResult): string | null {
  const { lemons, sugar, ice } = yesterday.recipe
  if (sugar >= lemons + 3) return 'Customers said the cup was too sweet.'
  if (lemons >= sugar + 3) return 'Customers said the cup was too sour.'
  if (yesterday.taste < 55 && Math.min(lemons, sugar) <= 2) return 'Customers said the cup tasted watery.'
  if (yesterday.iceComfort < 50 && (yesterday.weather.heat === 'hot' || yesterday.weather.heat === 'warm') && ice <= 2) {
    return 'Customers said the cup was warm.'
  }
  if (yesterday.iceComfort < 50 && ice >= 6 && (yesterday.weather.heat === 'cold' || yesterday.weather.heat === 'cool')) {
    return 'Customers said the ice watered the cup down.'
  }
  if (yesterday.taste < 55) return 'Customers said the recipe tasted off.'
  return null
}

export function morningBrief(weather: Weather, yesterday: DayResult | null): Brief {
  if (!yesterday) {
    return {
      kicker: 'Mentor',
      text: 'You have $20 and an empty stand. Buy what you can turn into cups, and price above the supplies. The score is what you earn per hour — not how busy the line looks.',
    }
  }

  const loss = overnightLoss(yesterday)
  if (loss) {
    const complaint = recipeComplaint(yesterday)
    return {
      kicker: 'This morning',
      text: complaint ? `${loss} ${complaint}` : loss,
    }
  }

  if (yesterday.hours === 0) {
    return {
      kicker: 'About yesterday',
      text: 'Closing can be a smart call when the day is wrong. Today, match the buy to the sky.',
    }
  }

  if (yesterday.soldOutMissed >= 8) {
    return {
      kicker: 'About yesterday',
      text: `${yesterday.soldOutMissed} people wanted a cup and left with nothing. Sold out feels successful. Those were sales you didn't get — and word of mouth notices.`,
    }
  }

  if (yesterday.netCents < 0) {
    return {
      kicker: 'About yesterday',
      text: 'Money moved, and the day still lost. Check the cup cost against your price, then the stand fee. Revenue is not profit.',
    }
  }

  if (
    yesterday.earningsPerHourCents !== null &&
    yesterday.earningsPerHourCents < 150 &&
    yesterday.sold >= 15
  ) {
    return {
      kicker: 'About yesterday',
      text: `You sold ${yesterday.sold} cups and cleared ${formatMoney(yesterday.earningsPerHourCents)} an hour. A long line can still be a weak business. Price, waste, or hours usually explain it.`,
    }
  }

  const complaint = recipeComplaint(yesterday)
  if (complaint) {
    return { kicker: 'About yesterday', text: complaint }
  }

  if (yesterday.recipe.priceCents > yesterday.fairPriceCents * 1.45 && yesterday.walkedAway > yesterday.sold) {
    return {
      kicker: 'About yesterday',
      text: 'Plenty of people looked and kept walking. When the price outruns the day, you do not get a premium. You get an empty hour.',
    }
  }

  if (weather.sky === 'rain') {
    return {
      kicker: 'Today',
      text: 'Rain thins the crowd. Dropping the price will not invent customers. It mostly gives away margin you needed.',
    }
  }

  if (weather.heat === 'hot' && weather.sky === 'clear') {
    return {
      kicker: 'Today',
      text: 'Hot and clear is the best shelf you get. A cold, balanced cup can carry a real price. Do not race to the cheapest cup on your best day.',
    }
  }

  if (yesterday.earningsPerHourCents !== null && yesterday.earningsPerHourCents >= 600) {
    return {
      kicker: 'About yesterday',
      text: 'That was a real business day. Repeat it on purpose: price for the weather, ice for the weather, hours you can actually fill.',
    }
  }

  return {
    kicker: 'Mentor',
    text: `Today looks ${weatherPhrase(weather).toLowerCase()}. Watch three things: cups you can make, cash left after supplies, and hours you are about to spend.`,
  }
}

export interface Verdict {
  headline: string
  answer: string
}

export function dayVerdict(day: DayResult): Verdict {
  if (day.hours === 0) {
    return {
      headline: 'You stayed closed',
      answer: 'No hours means no hourly rate. Closing protects your time.',
    }
  }
  const hourly = day.earningsPerHourCents ?? 0
  const busyAndThin = day.sold >= 20 && hourly < 200
  if (hourly >= 800) {
    return {
      headline: 'Yes. This was a real business day.',
      answer: busyAndThin
        ? 'The line was long and the pay was strong. Keep an eye on waste before you add hours.'
        : 'You got paid like someone who priced with intention. Sales, costs, and time all landed.',
    }
  }
  if (hourly >= 350) {
    return {
      headline: 'Mostly. The stand paid you for real.',
      answer: 'This is more than pocket change per hour. Before you scale it, see whether a longer day would dilute the rate.',
    }
  }
  if (hourly >= 140) {
    return {
      headline: busyAndThin ? 'Busy stand. Thin pay.' : 'Not yet a strong business.',
      answer: busyAndThin
        ? `You sold ${day.sold} cups and still cleared only ${formatMoney(hourly)} an hour. High sales are not the same as a good business.`
        : 'A little profit showed up. Your hour is still priced like a hobby until the margin or the hours change.',
    }
  }
  if (hourly >= 0) {
    return {
      headline: busyAndThin ? 'Lots of cups. Almost no pay.' : 'You made money. Your hour barely did.',
      answer: 'Cash in the box can hide a weak rate. Divide net profit by the hours you stood there. That is the job this stand is offering you.',
    }
  }
  return {
    headline: 'No. The stand paid you less than zero.',
    answer: 'Time invested plus a loss is a job you paid to do. Change the price, the recipe, or stay closed when the day cannot carry a cup.',
  }
}

export function seasonVerdict(hourlyCents: number | null, netCents: number): Verdict {
  if (hourlyCents === null) {
    return {
      headline: 'The stand never opened.',
      answer: 'There is no hourly rate without hours. A season of closed days did not build a business — it avoided one.',
    }
  }
  if (hourlyCents >= 650 && netCents > 0) {
    return {
      headline: 'Yes. You built a business, not just a busy week.',
      answer: 'Season earnings per hour are the whole game. You kept enough after supplies, fees, and time for the stand to be worth running.',
    }
  }
  if (hourlyCents >= 350 && netCents > 0) {
    return {
      headline: 'Close. The model works if you protect it.',
      answer: 'Profit is real. The next gain is usually waste, a smarter price on hot days, or fewer hours that do not add sales.',
    }
  }
  if (hourlyCents >= 140) {
    return {
      headline: 'You learned the loop. The pay is still a side hustle.',
      answer: 'Customers and sales happened. Earnings per hour say the business is not paying you like a skill yet.',
    }
  }
  if (netCents < 0) {
    return {
      headline: 'No. The season cost you money and time.',
      answer: 'Ending cash can bounce around. Net profit and the hourly rate are the honest score. This run did not clear either bar.',
    }
  }
  return {
    headline: 'Not really. The till survived. Your hour did not.',
    answer: 'A positive season can still be a bad job. If expenses or long shifts ate the rate, the business needs a redesign, not just more cups.',
  }
}

export function dayTip(day: DayResult): string {
  if (day.hours === 0) {
    return 'The report still prints a full profit-and-loss so a zero is a decision, not a missing page.'
  }
  if (day.soldOutMissed >= 8) {
    return 'A sellout is not a perfect day. Every missed buyer is revenue that never entered the receipt.'
  }
  if (day.helperCents > 0 && day.sold >= day.cupsReady && day.cupsReady > 0) {
    return 'You sold every cup you could make. The longer shift added a helper wage and more hours under the same sales.'
  }
  if (day.helperCents > 0) {
    return 'A helper lets you stay open past 8 hours. That wage is an other expense, and those hours still count in the rate.'
  }
  if (day.recipe.priceCents < day.fairPriceCents * 0.7 && day.sold >= 10) {
    return 'Customers were happy to pay more than you asked. A low price can fill the line and still underpay you.'
  }
  if (day.walkedAway > day.sold && day.recipe.priceCents > day.fairPriceCents) {
    return 'Walkaways came from the offer — price or taste — not from an empty stockroom.'
  }
  if (day.grossCents < 0) {
    return 'Gross profit is negative when the cup sells for less than the supplies inside it. The stand fee has not even been counted yet.'
  }
  return 'Read the receipt top to bottom. The hourly stamp is net profit divided by the 8 hours the stand was open.'
}

export const REFLECTIONS: { title: string; prompt: string }[] = [
  {
    title: 'Busy is not the same as paid',
    prompt: 'Which day looked busy but paid you the least per hour? What ate the profit — price, costs, or time?',
  },
  {
    title: 'Quiet leaks',
    prompt: 'Some supplies left the stand without becoming a sale. Where did value quietly disappear?',
  },
  {
    title: 'Tomorrow morning',
    prompt: 'If you opened again with the same $20 start, what would you change first?',
  },
]
