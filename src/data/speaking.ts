/**
 * Original IELTS-style Speaking practice material, written for this app. The three parts follow the public test
 * format (Part 1 short personal questions, Part 2 a cue card with one minute to prepare and up to two minutes to
 * speak, Part 3 abstract discussion). None of it is copied from a published book or a past exam.
 */

export interface Part1Topic {
  id: string;
  title: string;
  questions: string[];
}

export interface CueCard {
  id: string;
  /** The "Describe …" line. */
  title: string;
  /** "You should say:" bullets. */
  say: string[];
  /** The closing "and explain …" line. */
  explain: string;
  part3: string[];
}

export const PART1: Part1Topic[] = [
  { id: 'home', title: 'Home and accommodation', questions: [
    'Do you live in a house or an apartment?',
    'What is your favourite room in your home, and why?',
    'How long have you lived there?',
    'Is there anything you would like to change about your home?',
    'What kind of neighbourhood is it?',
    'Would you prefer to live somewhere else in the future?',
  ] },
  { id: 'work', title: 'Work', questions: [
    'What do you do for a living?',
    'Why did you choose that kind of work?',
    'What do you enjoy most about your job?',
    'Is there anything you find difficult at work?',
    'What would your ideal job be?',
    'Do you prefer working alone or with other people?',
  ] },
  { id: 'study', title: 'Studies', questions: [
    'What subject are you studying, or what did you study?',
    'Why did you choose that subject?',
    'What is the most interesting part of your studies?',
    'Do you prefer studying in the morning or at night?',
    'How do you usually revise for an exam?',
    'Would you like to study abroad?',
  ] },
  { id: 'hometown', title: 'Your hometown', questions: [
    'Where is your hometown?',
    'What is it famous for?',
    'Has your hometown changed much since you were a child?',
    'What do you like most about living there?',
    'Is it a good place for young people? Why, or why not?',
    'What would you show a visitor there?',
  ] },
  { id: 'routine', title: 'Daily routine', questions: [
    'What does a typical day look like for you?',
    'Are you a morning person or a night person?',
    'What part of the day do you enjoy most?',
    'Has your routine changed in the last few years?',
    'Do you like to plan your day, or do things as they come?',
    'What do you usually do at the weekend?',
  ] },
  { id: 'food', title: 'Food and cooking', questions: [
    'What kind of food do you enjoy most?',
    'Do you like cooking? Why, or why not?',
    'Is there any food you disliked as a child but like now?',
    'Do you prefer eating at home or in restaurants?',
    'What is a traditional dish in your country?',
    'How often do you try food from other countries?',
  ] },
  { id: 'free-time', title: 'Free time and hobbies', questions: [
    'What do you like to do in your free time?',
    'How did you become interested in that?',
    'Do you prefer relaxing alone or with friends?',
    'Is there a hobby you would like to try?',
    'Do you think people have enough free time these days?',
    'Did you have different hobbies as a child?',
  ] },
  { id: 'music', title: 'Music', questions: [
    'What kind of music do you listen to?',
    'When do you usually listen to music?',
    'Can you play a musical instrument?',
    'Did you learn music at school?',
    'Has your taste in music changed over time?',
    'Do you like going to live concerts?',
  ] },
  { id: 'tech', title: 'Technology', questions: [
    'How often do you use a computer or a phone?',
    'What do you mainly use your phone for?',
    'Is there any technology you find hard to use?',
    'Do you think people depend too much on technology?',
    'What was the first piece of technology you owned?',
    'Which new invention would you like to see in the future?',
  ] },
  { id: 'travel', title: 'Travel and holidays', questions: [
    'Do you like travelling?',
    'Where did you go on your most recent trip?',
    'Do you prefer to travel alone or in a group?',
    'What do you usually take with you on a trip?',
    'Is there a place you would love to visit one day?',
    'Do you prefer relaxing holidays or busy, active ones?',
  ] },
  { id: 'family', title: 'Family and friends', questions: [
    'Do you have a large family or a small one?',
    'Who in your family are you closest to?',
    'How often do you see your friends?',
    'What do you usually do together?',
    'What makes a good friend, in your opinion?',
    'Do you keep in touch with friends from your school days?',
  ] },
  { id: 'shopping', title: 'Shopping', questions: [
    'Do you enjoy shopping?',
    'Do you prefer shopping online or in shops?',
    'What was the last thing you bought?',
    'Do you usually plan what to buy, or buy on impulse?',
    'Are there any local markets near where you live?',
    'Have your shopping habits changed in recent years?',
  ] },
  { id: 'reading', title: 'Reading', questions: [
    'Do you like reading?',
    'What kinds of books or articles do you read?',
    'Do you prefer paper books or e-books?',
    'Did you read a lot as a child?',
    'Do you ever read in English?',
    'Do you think people read less than they used to?',
  ] },
  { id: 'sport', title: 'Sport and exercise', questions: [
    'Do you do any sport or exercise?',
    'What sports were popular when you were at school?',
    'Do you prefer exercising alone or in a team?',
    'Do you enjoy watching sport on television?',
    'What would encourage you to exercise more?',
    'Is there a sport you would like to learn?',
  ] },
  { id: 'transport', title: 'Transport', questions: [
    'How do you usually get to work or school?',
    'Is public transport good in your area?',
    'Do you prefer to walk, cycle or drive?',
    'What is the traffic like where you live?',
    'Have you ever been late because of transport problems?',
    'How do you think transport will change in the future?',
  ] },
  { id: 'weather', title: 'Weather and seasons', questions: [
    'What is the weather like in your country?',
    'Which season do you like best?',
    'Does the weather affect your mood?',
    'What do you do on a very hot or very rainy day?',
    'Does the weather change what you wear or eat?',
    'Would you like to live in a different climate?',
  ] },
  { id: 'clothes', title: 'Clothes', questions: [
    'What kind of clothes do you usually wear?',
    'Do you care about fashion?',
    'Do you wear different clothes at work and at home?',
    'Where do you usually buy your clothes?',
    'Is there any traditional clothing in your country?',
    'Have your clothing preferences changed since you were younger?',
  ] },
  { id: 'social-media', title: 'Social media and communication', questions: [
    'Do you use social media?',
    'Which apps do you use most, and why?',
    'Do you prefer to message people or to call them?',
    'Do you think social media has changed how friends communicate?',
    'Do you share personal photos online?',
    'How do older people in your family use technology to keep in touch?',
  ] },
  { id: 'sleep', title: 'Sleep and health', questions: [
    'How many hours do you usually sleep?',
    'Do you ever take a nap during the day?',
    'What do you do to stay healthy?',
    'Do you think you eat a balanced diet?',
    'What do you do when you feel stressed?',
    'Would you like to change anything about your lifestyle?',
  ] },
];

export const CUE_CARDS: CueCard[] = [
  { id: 'teacher', title: 'Describe a teacher who has influenced you.', say: ['who the teacher was', 'what subject they taught', 'what they were like as a person'], explain: 'why this teacher had such an influence on you.', part3: [
    'What qualities make a good teacher?',
    'Do you think teachers are respected as much now as in the past?',
    'How might technology change the role of teachers in the future?',
    'Should students be allowed to give feedback on their teachers?',
  ] },
  { id: 'place-relax', title: 'Describe a place where you go to relax.', say: ['where it is', 'how often you go there', 'what you do there'], explain: 'why this place helps you relax.', part3: [
    'Why do some people find it hard to relax?',
    'Do you think city life makes people more stressed than country life?',
    'How important are public parks and green spaces in a city?',
    'Is it better to relax alone or with other people?',
  ] },
  { id: 'helped', title: 'Describe a time when you helped someone.', say: ['who you helped', 'what the problem was', 'how you helped them'], explain: 'how you felt afterwards.', part3: [
    'Why do some people volunteer their time to help others?',
    'Should children be taught to help others at school?',
    'Is it the government’s job or individuals’ job to help people in need?',
    'Do people help each other less than they used to?',
  ] },
  { id: 'skill', title: 'Describe a skill you would like to learn.', say: ['what the skill is', 'why you want to learn it', 'how you would go about learning it'], explain: 'how this skill would be useful to you.', part3: [
    'Which skills do young people need most today?',
    'Is it better to learn a skill from a teacher or by yourself?',
    'Do you think schools teach enough practical skills?',
    'Why do some people give up when learning something new?',
  ] },
  { id: 'journey', title: 'Describe an interesting journey you have taken.', say: ['where you went', 'how you travelled', 'who you were with'], explain: 'why the journey was interesting.', part3: [
    'Why do people like to travel to other countries?',
    'What are the effects of mass tourism on a place?',
    'Will people travel more or less in the future?',
    'Is it better to travel with a plan or to be spontaneous?',
  ] },
  { id: 'building', title: 'Describe a building you find interesting.', say: ['where it is', 'what it looks like', 'what it is used for'], explain: 'why you find it interesting.', part3: [
    'Should old buildings be preserved or replaced with modern ones?',
    'How does the architecture of a city affect the people living there?',
    'Why do cities build very tall buildings?',
    'Who should pay to protect historic buildings?',
  ] },
  { id: 'gift', title: 'Describe a gift you gave to someone.', say: ['what the gift was', 'who you gave it to', 'why you chose it'], explain: 'how the person reacted.', part3: [
    'Why do people give gifts on special occasions?',
    'Is the thought behind a gift more important than its price?',
    'Do you think people spend too much money on gifts nowadays?',
    'How have gift-giving traditions changed in your country?',
  ] },
  { id: 'friend', title: 'Describe a friend you have known for a long time.', say: ['how you met', 'how long you have known each other', 'what you do together'], explain: 'why the friendship has lasted.', part3: [
    'Is it easier to make friends as a child or as an adult?',
    'How has technology changed the way friends stay in touch?',
    'Do you think friends should have similar interests?',
    'Can online friendships be as strong as face-to-face ones?',
  ] },
  { id: 'event', title: 'Describe a festival or celebration in your country.', say: ['what the celebration is', 'when it takes place', 'what people do'], explain: 'why it is important to people.', part3: [
    'Why do societies have traditional celebrations?',
    'Are traditional festivals becoming less important?',
    'Do celebrations bring families and communities closer?',
    'Should the government pay for public festivals?',
  ] },
  { id: 'book', title: 'Describe a book or film that made a strong impression on you.', say: ['what it was called', 'what it was about', 'when you read or watched it'], explain: 'why it made such an impression.', part3: [
    'Why are stories so popular in every culture?',
    'Do films have more influence on people than books?',
    'Should schools make students read classic literature?',
    'How might reading habits change in the future?',
  ] },
  { id: 'decision', title: 'Describe an important decision you made.', say: ['what the decision was', 'when you made it', 'who or what helped you decide'], explain: 'whether you think it was the right decision.', part3: [
    'Do people make better decisions alone or after asking others?',
    'At what age should young people start making important decisions?',
    'Why do some people find it difficult to make decisions?',
    'How can schools help students make good decisions about their future?',
  ] },
  { id: 'technology', title: 'Describe a piece of technology you use every day.', say: ['what it is', 'how you use it', 'how long you have had it'], explain: 'why it is important in your daily life.', part3: [
    'How has technology changed the way people work?',
    'Are there any disadvantages to relying on technology?',
    'Should children be limited in how much they use screens?',
    'Do you think technology will make life easier or more complicated in future?',
  ] },
  { id: 'person-admire', title: 'Describe a person you admire.', say: ['who the person is', 'how you know about them', 'what they have achieved'], explain: 'why you admire them.', part3: [
    'What qualities make someone a good role model?',
    'Do famous people have a responsibility to set a good example?',
    'Who has more influence on children, parents or celebrities?',
    'Do people admire different qualities now than in the past?',
  ] },
  { id: 'wild-place', title: 'Describe a natural place you have visited.', say: ['where it is', 'when you went there', 'what you saw and did'], explain: 'how you felt about being there.', part3: [
    'Why is it important to protect natural areas?',
    'Should people have to pay to enter national parks?',
    'How can individuals help protect the environment?',
    'Do you think young people spend enough time in nature?',
  ] },
  { id: 'sport-event', title: 'Describe a sporting event you watched or took part in.', say: ['what the event was', 'where and when it took place', 'what happened'], explain: 'how you felt about it.', part3: [
    'Why do so many people enjoy watching sport?',
    'Does hosting a major sporting event benefit a country?',
    'Should sport be a compulsory school subject?',
    'Are professional athletes paid too much?',
  ] },
  { id: 'food-meal', title: 'Describe a memorable meal you had.', say: ['where you had it', 'who you were with', 'what you ate'], explain: 'why the meal was memorable.', part3: [
    'Why do families and friends often celebrate with a meal?',
    'Is fast food becoming more popular than home cooking? Why?',
    'Should the government do more to encourage healthy eating?',
    'How have eating habits changed in your country?',
  ] },
  { id: 'mistake', title: 'Describe a time you made a mistake and learned from it.', say: ['what the mistake was', 'how it happened', 'what you did about it'], explain: 'what you learned from the experience.', part3: [
    'Is it important for children to be allowed to make mistakes?',
    'How should employers react when staff make mistakes?',
    'Why are some people afraid of failure?',
    'Can failure be more valuable than success?',
  ] },
  { id: 'old-thing', title: 'Describe something old that is special to you.', say: ['what it is', 'how long you have had it', 'how you got it'], explain: 'why it is special to you.', part3: [
    'Why do people keep objects from the past?',
    'Do young people value traditions and old things less than older people?',
    'Should museums be free for everyone?',
    'Is it better to repair old things or replace them?',
  ] },
  { id: 'crowded', title: 'Describe a crowded place you have been to.', say: ['where it was', 'why it was crowded', 'what you did there'], explain: 'how you felt about the crowd.', part3: [
    'Why are cities getting more crowded?',
    'How can governments reduce overcrowding in big cities?',
    'Do some people actually enjoy crowds?',
    'What are the effects of overcrowding on public transport?',
  ] },
  { id: 'goal', title: 'Describe a goal you hope to achieve in the future.', say: ['what the goal is', 'when you hope to achieve it', 'what you need to do to achieve it'], explain: 'why this goal matters to you.', part3: [
    'Is it important for people to set goals?',
    'Do young people today have different goals from their parents’ generation?',
    'What can stop people from reaching their goals?',
    'Should schools help students plan their careers?',
  ] },
  { id: 'job-other', title: 'Describe a job you would not like to do.', say: ['what the job is', 'what the work involves', 'what you know about it'], explain: 'why you would not like to do it.', part3: [
    'What makes a job satisfying?',
    'Should people choose a job for money or for enjoyment?',
    'Will robots and automation replace many jobs?',
    'Why are some important jobs badly paid?',
  ] },
  { id: 'advertisement', title: 'Describe an advertisement you remember well.', say: ['where you saw it', 'what it was for', 'what it showed or said'], explain: 'why you remember it.', part3: [
    'How much do advertisements influence what people buy?',
    'Should advertising to children be banned?',
    'Is online advertising different from traditional advertising?',
    'Do adverts give a fair picture of products?',
  ] },
  { id: 'learn-language', title: 'Describe a time when you had to communicate in a language that was not your own.', say: ['where you were', 'who you were speaking to', 'what you had to say'], explain: 'how well you managed and how you felt.', part3: [
    'Why is it useful to speak more than one language?',
    'Do you think English will remain the main world language?',
    'What is the best way to learn a foreign language?',
    'Should all children learn a second language at school?',
  ] },
  { id: 'park-city', title: 'Describe a change that has improved your local area.', say: ['what changed', 'when it happened', 'who made it happen'], explain: 'how it has made life better for people there.', part3: [
    'Who should decide how a city develops, the government or local people?',
    'What problems come with rapid urban development?',
    'How can cities be made more pleasant to live in?',
    'Is it better to live in a new, modern area or an old, established one?',
  ] },
];

export const PART1_BY_ID: Record<string, Part1Topic> = Object.fromEntries(PART1.map((t) => [t.id, t]));
export const CUE_BY_ID: Record<string, CueCard> = Object.fromEntries(CUE_CARDS.map((c) => [c.id, c]));
