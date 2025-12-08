The "Expected Cash" and "Expected Credit Card" figures in the Daily Closing report do *not* include voided transactions.

The SQL function `pos.get_daily_closing_summary`, which calculates these values, explicitly filters out transactions with a status of 'voided' when determining the `expected_cash`, `expected_credit_card`, and `total_sales`.

Voided transactions are counted and summed separately and displayed in the `voided_count` and `voided_amount` fields within the summary.