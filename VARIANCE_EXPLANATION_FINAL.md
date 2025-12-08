# Final Variance Explanation

Based on the data and your confirmation, here is the most likely explanation for the differences.

## 1. Credit Card Overage (+฿1,515.00)

The terminal has more money than the POS expects because **two transactions were likely paid by Credit Card but recorded differently in the POS.**

### A. The ฿1,085 Transaction (Major Cause)
*   **What happened:** You have a transaction for **฿1,085** recorded as **"Digital Wallet"** (QR) in the POS (ID: `dd1e...` at 8:07 PM).
*   **The Error:** It is highly likely this was **actually paid using the Credit Card terminal**.
*   **Result:** The POS expects this money in the "QR" bucket, but the Terminal has it in the "Credit Card" bucket.
*   **Evidence:** ฿1,085 matches the major part of your variance exactly.

### B. The Remaining ~฿430 and Cash Shortage (-฿295)
*   **What happened:** The remaining Credit Card overage (฿1,515 - ฿1,085 = ฿430) and the Cash Shortage (฿295) are related.
*   **The Error:** A transaction of approx **฿330** (e.g., the Cash sale at 1:56 PM) was likely **rung as Cash but paid by Credit Card**.
    *   If you take the **฿330** Cash sale -> Pay by Card:
        *   Cash becomes **-฿330 short**. (Close to your -฿295 actual).
        *   Card becomes **+฿330 over**.
    *   Add the **฿1,085** from above:
        *   Total Card Overage: 1,085 + 330 = **+฿1,415**. (Very close to your +฿1,515 actual).
        *   Difference: **฿100** (likely a small tip or miscount).

## Conclusion
The variance is not due to a "Void" failing, but due to **Payment Method Selection Errors**:
1.  **฿1,085** was rung as **QR/Digital Wallet** but paid by **Card**.
2.  **~฿330** was rung as **Cash** but paid by **Card**.

**Action:**
You can proceed with the closing. For the variance note, you can write:
*"Likely payment method errors: 1085 rung as QR but paid CC, and ~330 rung as Cash but paid CC."*
