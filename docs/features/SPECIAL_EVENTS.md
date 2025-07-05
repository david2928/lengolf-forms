# Special Events System Documentation

## Overview

The Lengolf Forms special events system manages tournament-style competitions and special scoring events. The primary implementation is the US Open scoring system that tracks employee-submitted customer scores with screenshot verification and comprehensive reporting.

## US Open Scoring System

### System Purpose

The US Open scoring system enables employees to:
- Record customer scores for tournament events
- Submit screenshot evidence of scores
- Track both Stableford and Stroke play formats
- Generate tournament reports and leaderboards
- Maintain audit trails for competition integrity

### Database Schema

#### us_open_scores Table
```sql
CREATE TABLE us_open_scores (
    id BIGSERIAL PRIMARY KEY,
    employee TEXT NOT NULL,
    date DATE NOT NULL,
    customer_id BIGINT NOT NULL,
    stableford_score INTEGER NOT NULL,
    stroke_score INTEGER NOT NULL,
    stableford_screenshot_url TEXT NOT NULL,
    stroke_screenshot_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Fields**:
- `employee`: Staff member who submitted the scores
- `customer_id`: Reference to CRM customer (external system)
- `stableford_score`: Points-based scoring system score
- `stroke_score`: Traditional stroke count score
- `*_screenshot_url`: URL to screenshot evidence stored in cloud storage

### Features and Functionality

#### 1. Score Submission Interface

##### Employee Score Entry Form
- **Customer Selection**: Search and select customers from CRM
- **Dual Scoring**: Support for both Stableford and Stroke formats
- **Screenshot Upload**: Mandatory screenshot evidence
- **Validation**: Score range and format validation
- **Submit Confirmation**: Review before final submission

##### Form Validation Rules
```typescript
interface ScoreValidation {
  stableford: {
    min: 0,
    max: 72, // Maximum possible Stableford points
    required: true
  },
  stroke: {
    min: 50, // Reasonable minimum score
    max: 150, // Reasonable maximum score
    required: true
  },
  screenshots: {
    required: true,
    formats: ['jpg', 'jpeg', 'png'],
    maxSize: '5MB'
  }
}
```

#### 2. Screenshot Management

##### Upload Process
1. **Image Validation**: Format and size checking
2. **Cloud Upload**: Store in secure cloud storage (AWS S3/Google Cloud)
3. **URL Generation**: Generate secure access URLs
4. **Database Storage**: Store URLs in score records
5. **Backup Creation**: Automatic backup of evidence

##### Storage Structure
```
/us-open-screenshots/
  /{year}/
    /{month}/
      /{employee}/
        /stableford_{customer_id}_{timestamp}.jpg
        /stroke_{customer_id}_{timestamp}.jpg
```

#### 3. Tournament Management

##### Tournament Configuration
- **Event Dates**: Define tournament start/end dates
- **Scoring Rules**: Configure scoring system parameters
- **Participant Eligibility**: Set customer participation criteria
- **Prize Categories**: Define award categories and criteria

##### Real-Time Leaderboards
```typescript
interface LeaderboardEntry {
  rank: number;
  customer_id: number;
  customer_name: string;
  stableford_total: number;
  stroke_total: number;
  round_count: number;
  best_round_stableford: number;
  best_round_stroke: number;
  latest_submission: Date;
  submitted_by: string;
}
```

#### 4. Reporting and Analytics

##### Tournament Reports
- **Daily Summaries**: Scores submitted each day
- **Leaderboard Rankings**: Current standings
- **Participation Statistics**: Employee and customer participation
- **Score Distribution**: Statistical analysis of scores

##### Employee Performance Tracking
- **Submission Count**: Number of scores entered per employee
- **Accuracy Metrics**: Score verification and validation
- **Timeliness**: Speed of score entry after rounds
- **Customer Coverage**: Diversity of customers served

## API Endpoints

### Score Submission

#### Submit New Score
```
POST /api/events/us-open/scores
```

**Payload**:
```json
{
  "employee": "John Smith",
  "customer_id": 12345,
  "date": "2024-07-15",
  "stableford_score": 35,
  "stroke_score": 82,
  "stableford_screenshot": "base64_image_data",
  "stroke_screenshot": "base64_image_data"
}
```

**Response**:
```json
{
  "success": true,
  "score_id": 789,
  "message": "Score submitted successfully",
  "leaderboard_position": 15
}
```

#### Get Tournament Leaderboard
```
GET /api/events/us-open/leaderboard?format=stableford&limit=50
```

**Response**:
```json
{
  "tournament_info": {
    "name": "US Open 2024",
    "start_date": "2024-07-01",
    "end_date": "2024-07-31",
    "total_participants": 156
  },
  "leaderboard": [
    {
      "rank": 1,
      "customer_id": 12345,
      "customer_name": "Tiger Woods",
      "total_score": 245,
      "round_count": 7,
      "average_score": 35.0,
      "best_round": 42
    }
  ]
}
```

### Score Management

#### Update Existing Score
```
PUT /api/events/us-open/scores/{scoreId}
```

**Requirements**: Admin authentication, audit logging

#### Delete Score Entry
```
DELETE /api/events/us-open/scores/{scoreId}
```

**Requirements**: Admin authentication, reason logging

### Reporting APIs

#### Generate Tournament Report
```
POST /api/events/us-open/reports/generate
```

**Payload**:
```json
{
  "report_type": "daily_summary|leaderboard|employee_stats",
  "date_range": {
    "start": "2024-07-01",
    "end": "2024-07-31"
  },
  "format": "pdf|excel|json"
}
```

## Business Logic

### Scoring Calculations

#### Stableford Scoring System
```typescript
function calculateStablefordPoints(strokes: number, par: number, handicap: number): number {
  const netStrokes = strokes - handicap;
  const scoreToPar = netStrokes - par;
  
  switch (scoreToPar) {
    case -3: return 5; // Eagle
    case -2: return 4; // Eagle
    case -1: return 3; // Birdie
    case 0: return 2;  // Par
    case 1: return 1;  // Bogey
    default: return 0; // Double bogey or worse
  }
}
```

#### Tournament Rankings
```typescript
function calculateTournamentRankings(scores: USOpenScore[]): LeaderboardEntry[] {
  // Group scores by customer
  const customerScores = groupBy(scores, 'customer_id');
  
  // Calculate totals and statistics
  const leaderboard = Object.entries(customerScores).map(([customerId, scores]) => {
    const stablefordTotal = sum(scores.map(s => s.stableford_score));
    const strokeTotal = sum(scores.map(s => s.stroke_score));
    const roundCount = scores.length;
    
    return {
      customer_id: Number(customerId),
      stableford_total: stablefordTotal,
      stroke_total: strokeTotal,
      round_count: roundCount,
      average_stableford: stablefordTotal / roundCount,
      average_stroke: strokeTotal / roundCount,
      best_round_stableford: Math.max(...scores.map(s => s.stableford_score)),
      best_round_stroke: Math.min(...scores.map(s => s.stroke_score))
    };
  });
  
  // Sort by total score (Stableford descending, Stroke ascending)
  return leaderboard
    .sort((a, b) => b.stableford_total - a.stableford_total)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
```

### Data Validation

#### Score Validation Logic
```typescript
function validateScoreSubmission(submission: ScoreSubmission): ValidationResult {
  const errors: string[] = [];
  
  // Validate scores
  if (submission.stableford_score < 0 || submission.stableford_score > 72) {
    errors.push('Stableford score must be between 0 and 72');
  }
  
  if (submission.stroke_score < 50 || submission.stroke_score > 150) {
    errors.push('Stroke score must be between 50 and 150');
  }
  
  // Validate screenshots
  if (!submission.stableford_screenshot || !submission.stroke_screenshot) {
    errors.push('Both screenshot types are required');
  }
  
  // Validate date
  const tournamentStart = new Date('2024-07-01');
  const tournamentEnd = new Date('2024-07-31');
  const submissionDate = new Date(submission.date);
  
  if (submissionDate < tournamentStart || submissionDate > tournamentEnd) {
    errors.push('Score date must be within tournament period');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

## User Interface

### Score Submission Form

#### Design Principles
- **Mobile-First**: Optimized for tablet/phone use on the course
- **Quick Entry**: Minimal steps to submit scores
- **Visual Confirmation**: Clear feedback on successful submissions
- **Error Prevention**: Real-time validation and guidance

#### Form Components
```typescript
interface ScoreFormProps {
  onSubmit: (score: ScoreSubmission) => void;
  employees: Employee[];
  customers: Customer[];
}

const ScoreSubmissionForm: React.FC<ScoreFormProps> = ({
  onSubmit,
  employees,
  customers
}) => {
  const [formData, setFormData] = useState<ScoreSubmission>({
    employee: '',
    customer_id: null,
    date: new Date().toISOString().split('T')[0],
    stableford_score: '',
    stroke_score: '',
    stableford_screenshot: null,
    stroke_screenshot: null
  });

  // Form implementation with validation and submission logic
};
```

### Tournament Dashboard

#### Real-Time Leaderboard
- **Live Updates**: Automatic refresh of standings
- **Multiple Views**: Stableford and Stroke leaderboards
- **Filtering Options**: By date range, employee, customer
- **Export Functions**: PDF and Excel export capabilities

#### Administrative Controls
- **Score Management**: Edit/delete existing scores
- **Tournament Settings**: Configure tournament parameters
- **Report Generation**: Create comprehensive reports
- **User Management**: Manage employee access

## Integration Points

### CRM Integration

#### Customer Data Sync
```typescript
async function syncCustomerData(customer_id: number): Promise<CustomerData> {
  const crmResponse = await fetch(`${CRM_API_BASE}/customers/${customer_id}`, {
    headers: {
      'Authorization': `Bearer ${CRM_API_TOKEN}`
    }
  });
  
  const customerData = await crmResponse.json();
  
  return {
    id: customerData.id,
    name: customerData.name,
    membership_type: customerData.membership_type,
    handicap: customerData.handicap,
    phone: customerData.phone,
    email: customerData.email
  };
}
```

#### Score Synchronization
- **Bi-directional Sync**: Scores sync to CRM system
- **Conflict Resolution**: Handle data conflicts between systems
- **Audit Trail**: Track all synchronization activities
- **Error Recovery**: Automatic retry for failed syncs

### LINE Messaging Integration

#### Tournament Notifications
```typescript
async function sendTournamentUpdate(type: 'daily_leader' | 'new_record' | 'tournament_end') {
  const message = await generateTournamentMessage(type);
  await sendLINEMessage('tournament-updates', message);
}

// Daily leader notification
async function sendDailyLeaderUpdate() {
  const leaderboard = await getTournamentLeaderboard(1); // Top 1
  const leader = leaderboard[0];
  
  const message = `🏆 US Open Daily Leader Update
  
Leading: ${leader.customer_name}
Stableford Total: ${leader.stableford_total} points
Stroke Total: ${leader.stroke_total} strokes
Rounds Played: ${leader.round_count}

Keep up the great play! 🏌️‍♂️`;
  
  await sendLINEMessage('tournament-updates', message);
}
```

### Cloud Storage Integration

#### Screenshot Storage
- **AWS S3/Google Cloud**: Secure cloud storage
- **CDN Distribution**: Fast access to images
- **Access Controls**: Authenticated access only
- **Backup Strategy**: Multi-region backup storage

## Monitoring and Analytics

### Performance Metrics

#### Tournament KPIs
- **Participation Rate**: Percentage of eligible customers participating
- **Submission Frequency**: Scores submitted per day
- **Employee Engagement**: Staff participation in score recording
- **Data Quality**: Screenshot verification rates

#### System Performance
- **Upload Success Rate**: Screenshot upload reliability
- **API Response Times**: System responsiveness
- **Storage Usage**: Cloud storage consumption
- **Sync Success Rate**: CRM integration reliability

### Reporting Dashboards

#### Tournament Analytics
- **Score Trends**: Statistical analysis of scoring patterns
- **Participation Analytics**: Customer engagement metrics
- **Performance Comparison**: Year-over-year comparisons
- **Prize Distribution**: Award category analysis

#### Operational Reports
- **Daily Submissions**: Scores entered each day
- **Employee Activity**: Staff submission tracking
- **Error Logs**: System error tracking
- **Audit Reports**: Security and compliance reporting

## Security and Compliance

### Data Protection

#### Screenshot Security
- **Encrypted Storage**: All screenshots encrypted at rest
- **Access Logging**: Track all screenshot access
- **Retention Policy**: Automatic deletion after tournament
- **Privacy Compliance**: GDPR/PDPA compliance measures

#### Score Integrity
- **Audit Trails**: Complete history of all score changes
- **Digital Signatures**: Verify screenshot authenticity
- **Access Controls**: Role-based access to score data
- **Backup Verification**: Regular backup integrity checks

### Competition Integrity

#### Anti-Fraud Measures
- **Duplicate Detection**: Prevent duplicate score submissions
- **Score Range Validation**: Detect unrealistic scores
- **Screenshot Analysis**: Verify screenshot authenticity
- **Audit Reviews**: Regular manual verification processes

## Troubleshooting

### Common Issues

#### Score Submission Problems
1. **Upload Failures**: Network issues during screenshot upload
2. **Validation Errors**: Incorrect score ranges or formats
3. **Customer ID Issues**: Invalid or missing customer references
4. **Date Range Errors**: Submissions outside tournament period

#### Integration Issues
1. **CRM Sync Failures**: Customer data synchronization problems
2. **Storage Access**: Cloud storage authentication issues
3. **LINE Notifications**: Message delivery failures
4. **Report Generation**: PDF/Excel export problems

### Resolution Procedures

#### Score Correction Process
1. **Identify Issue**: Error detection and logging
2. **Admin Review**: Manual verification of correction need
3. **Backup Creation**: Save current state before changes
4. **Correction Application**: Apply verified corrections
5. **Audit Logging**: Record all correction activities

## Future Enhancements

### Planned Features

#### Advanced Tournament Types
- **Multi-Round Tournaments**: Extended competition formats
- **Team Competitions**: Group-based scoring systems
- **Handicap Integration**: Automatic handicap calculations
- **Live Scoring**: Real-time score updates during play

#### Enhanced Analytics
- **Predictive Analytics**: Score prediction based on historical data
- **Performance Trends**: Long-term player improvement tracking
- **Course Analytics**: Hole-by-hole performance analysis
- **Weather Integration**: Weather impact on scoring

### Technical Improvements

#### Mobile App Enhancement
- **Native Mobile App**: Dedicated iOS/Android applications
- **Offline Capability**: Submit scores without internet connection
- **Camera Integration**: Direct camera capture for screenshots
- **GPS Integration**: Automatic location verification

#### AI Integration
- **Score Verification**: AI-powered screenshot verification
- **Fraud Detection**: Machine learning fraud prevention
- **Performance Insights**: AI-driven player analytics
- **Automated Reporting**: Intelligent report generation

## Development Guidelines

### Adding New Event Types

1. **Define Schema**: Create database schema for new event type
2. **API Development**: Implement event-specific APIs
3. **UI Components**: Create user interface components
4. **Integration Points**: Connect with existing systems
5. **Testing**: Comprehensive testing of new features

### Event Configuration

```typescript
interface EventConfig {
  type: 'tournament' | 'challenge' | 'league';
  scoring_system: 'stableford' | 'stroke' | 'match_play';
  duration: {
    start_date: Date;
    end_date: Date;
  };
  participants: {
    eligibility_criteria: string[];
    max_participants?: number;
  };
  prizes: {
    categories: PrizeCategory[];
    distribution: PrizeDistribution;
  };
}
```

### Testing Strategies

#### Unit Testing
- **Score Calculation**: Verify scoring algorithm accuracy
- **Validation Logic**: Test input validation rules
- **Data Processing**: Test data transformation functions
- **API Endpoints**: Test all API functionality

#### Integration Testing
- **CRM Integration**: Test customer data synchronization
- **Storage Integration**: Test screenshot upload/download
- **Notification System**: Test LINE message delivery
- **Report Generation**: Test all report formats

#### Performance Testing
- **Load Testing**: Test system under high submission volume
- **Storage Performance**: Test large file upload capabilities
- **Database Performance**: Test query performance with large datasets
- **API Performance**: Test response times under load 