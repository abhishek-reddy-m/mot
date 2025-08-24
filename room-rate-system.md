# Room Rate System

This document explains how the room rate system works in our booking application.

## Overview

Each room type has daily rates for each date, allowing for flexible pricing throughout the year. These rates are used to calculate the total cost of bookings based on the specific dates of the stay.

## Key Features

1. **Daily Rates**: Every room type has a specific rate for each date for the next 2 years.
2. **Rate Calendar**: Administrators can set and update these rates using the rate calendar interface.
3. **Dynamic Pricing**: Booking costs are calculated by summing the daily rates for each date of the stay.
4. **Base Price Fallback**: If a specific date doesn't have a custom rate, the room type's base price is used.

## How Rates Are Created

1. **Initial Setup**: When a new room type is created, daily rates are automatically generated for the next 2 years using the room type's base price.
2. **Rate Initialization**: The `initialize-rates.bat` script can be run to create or update rates for all room types.
3. **Custom Rates**: Administrators can customize rates for specific dates using the rate calendar.

## Rate Calendar

The rate calendar provides the following features:

1. **Month Navigation**: Browse through months to set rates for future dates.
2. **Jump to Month**: Quickly jump to a specific month within the next 2 years.
3. **Bulk Updates**: Set rates for all weekends, weekdays, or all days of a month at once.
4. **Individual Day Updates**: Fine-tune rates for specific days.

## Booking Price Calculation

When a booking is created, the total price is calculated as follows:

1. The system identifies all dates in the booking period (from check-in to check-out, excluding the check-out date).
2. For each date, it looks up the custom rate for that specific date and room type.
3. If a custom rate exists, it's used; otherwise, the room type's base price is used.
4. All daily rates are summed together.
5. The total is multiplied by the number of rooms booked.

## Implementation

The rate system is implemented through:

1. **Database Schema**: The `RoomTypeRate` table stores daily rates for each room type.
2. **Rate Calendar UI**: Located at `/admin/rate-calendar` for administrators.
3. **Price Calculator**: The `calculateBookingPrice` function in `price-calculator.ts` calculates booking costs.
4. **Rate Initialization**: The `setupFutureRates` function ensures rates exist for future dates.

## Best Practices

1. **Initialize Rates**: Always run the rate initialization when setting up new room types.
2. **Seasonal Pricing**: Set special rates for high and low seasons well in advance.
3. **Check Calculations**: Verify booking price calculations match the sum of daily rates.
4. **Regular Updates**: Periodically review and update rates to remain competitive.
