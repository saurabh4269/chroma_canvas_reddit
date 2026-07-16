# Devvit CLI

> Source: https://developers.reddit.com/docs/guides/tools/devvit_cli
> Scraped: 2026-07-16

# Devvit CLI

The Devvit CLI enables you to create, upload, and manage your apps. It's the bridge between your codebase and Reddit.

note

We collect usage metrics when you use the Devvit CLI. For more information, see [Reddit’s Developer Terms](https://www.redditinc.com/policies/developer-terms) and the [Reddit Privacy Policy](https://www.reddit.com/policies/privacy-policy). You can opt out at any time by running `npx devvit metrics off`.

## CLI Usage​

### devvit create icons​

Bundles all `SVG` files in the `/assets` folder into a new file (`src/icons.ts` by default). Enabling you to import local SVG assets in your app code.

#### Usage​
    
    
    $ npx devvit create icons [output-file]  
    

#### Optional argument​

  * `output-file`

Path to the output file. Defaults to `src/icons.ts`.

#### Generating the SVG bundle file​
    
    
    $ npx devvit create icons  
    
    
      
    
    
    $ npx devvit create icons "src/my-icons.ts"  
    

#### Using the SVG files in app code​

src/client/App.tsx
    
    
    import Icons from './my-icons.ts';  
    
    
      
    
    
    export const App = () => (  
    
    
      <img src={Icons['my-image.svg']} width={32} height={32} alt="" />  
    
    
    );  
    

### devvit help​

Display help for devvit

#### Usage​
    
    
    $ npx devvit help  
    

### devvit install​

Install an app from the Apps directory to a subreddit that you moderate. You can specify a version to install or default to @latest (the latest version).

#### Usage​
    
    
    $ npx devvit install <subreddit> [app-name]@[version]  
    

#### Required arguments​

  * `subreddit`

Name of the installation subreddit. The "r/" prefix is optional.

#### Optional arguments​

  * `app-name`

Name of the app to install (defaults to current project).

  * `version`

Specify the desired version (defaults to latest).

#### Examples​
    
    
    $ npx devvit install r/mySubreddit  
    
    
      
    
    
    $ npx devvit install mySubreddit my-app  
    
    
      
    
    
    $ npx devvit install r/mySubreddit my-app@1.2.3  
    
    
      
    
    
    $ npx devvit install r/mySubreddit @1.2.3  
    

### devvit list apps​

To see a list of apps you've published

#### Usage​
    
    
    $ npx devvit list apps  
    

### devvit list installs​

To see a list of all apps currently installed on a specified subreddit.

If no subreddit is specified, you'll get a list of all apps installed by you.

#### Usage​
    
    
    $ npx devvit list installs [subreddit]  
    

#### Optional argument​

  * `subreddit`

Name of the subreddit to look up installations for. The "r/" prefix is optional.

#### Examples​
    
    
    $ npx devvit list installs  
    
    
      
    
    
    $ npx devvit list installs mySubreddit  
    
    
      
    
    
    $ npx devvit list installs r/mySubreddit  
    

### devvit login​

Login to Devvit with your Reddit account in the browser.

#### Usage​
    
    
    $ npx devvit login [--copy-paste]  
    

#### Optional argument​

  * `--copy-paste`

If present, user will copy-paste code from the browser instead of the localhost.

### devvit logout​

Logs the current user out of Devvit.

#### Usage​
    
    
    $ npx devvit logout  
    

### devvit logs​

Stream logs for an installation within a specified subreddit. You can see 5,000 logs or up to 7 days of log events.

#### Usage​
    
    
    $ npx devvit logs <subreddit> [app-name] [-d <value>] [-j] [-s <value>] [--verbose]  
    

#### Required arguments​

  * `subreddit`

The subreddit name. The "r/" prefix is optional.

  * `app-name`

The app name (defaults to working directory app).

#### Optional arguments​

  * `-d <value>, --dateformat <value>`

Specify the format for rendering dates. Defaults to `MMM d HH:mm:ss` (Jan 15 18:30:03). See more about format options [here](https://date-fns.org/v2.29.3/docs/format).

  * `-j, --json`

Output JSON for each log line

  * `-s <value>, --since <value>`

Specify how far back you want the log streaming to start. Defaults to a `0m` (now) if omitted.

Supported format:

    * `s` seconds
    * `m` minutes
    * `h` hours
    * `d` days
    * `w` weeks

For example `15s`, `2w1d`, or `30m`.

  * `--verbose`

Displays the log levels and timestamps when the logs were created.

#### Examples​
    
    
    $ npx devvit logs r/mySubreddit  
    
    
      
    
    
    $ npx devvit logs mySubreddit my-app  
    
    
      
    
    
    $ npx devvit logs mySubreddit my-app --since 15s  
    
    
      
    
    
    $ npx devvit logs mySubreddit my-app --verbose  
    

### devvit new​

Create a new app.

#### Usage​
    
    
    $ npx devvit new [directory-name] [--here]  
    

#### Optional arguments​

  * `directory-name`

Directory name for your new app project. This creates a new directory for your app code. If no name is entered, you will be prompted to choose one.

  * `--here`

Generate the project here and not in a subdirectory.

#### Examples​
    
    
    $ npx devvit new  
    
    
      
    
    
    $ npx devvit new tic-tac-toe  
    
    
      
    
    
    $ npx devvit new --here  
    

### devvit playtest​

Installs your app to your test subreddit and starts a playtest session. A new version of your app is installed whenever you save changes to your app code, and logs are continuously streamed. Press `ctrl+c` to end the playtest session. Once ended, the latest installed version will remain unless you revert to a previous version using `devvit install`. For more information, see the [playtest page](/docs/guides/tools/playtest).

#### Usage​
    
    
    $ npx devvit playtest  
    

#### Optional argument​

  * subreddit Name of a test subreddit with less than 200 subscribers that you moderate. The "r/" prefix is optional.

If no subreddit is specified, the command will use the first available option from:

  * DEVVIT_SUBREDDIT environment variable
  * dev.subreddit field in devvit.json
  * The playtest subreddit stored for your app

If none exist, a new playtest subreddit will be automatically created.

### devvit settings list​

List settings for your app. These settings exist at the global app-scope and are available to all instances of your app.

#### Usage​
    
    
    $ npx devvit settings list  
    

### devvit settings set​

Create and update settings for your app. These settings will be added at the global app-scope.

#### Usage​
    
    
    $ npx devvit settings set <my-setting>  
    

#### Example​
    
    
    $ npx devvit settings set my-feature-flag  
    

### devvit uninstall​

Uninstall an app from a specified subreddit.

#### Usage​
    
    
    $ npx devvit uninstall <subreddit> [app-name]  
    

#### Required argument​

  * `subreddit`

Name of the subreddit. The "r/" prefix is optional. Requires moderator permissions in the subreddit.

  * `app-name`

Name of the app (defaults to the working directory app).

#### Examples​
    
    
    $ npx devvit uninstall r/mySubreddit  
    
    
      
    
    
    $ npx devvit uninstall mySubreddit  
    
    
      
    
    
    $ npx devvit uninstall mySubreddit my-app  
    

### devvit update app​

Update @devvit project dependencies to the currently installed CLI's version

#### Usage​
    
    
    $ npx devvit update app  
    

### devvit upload​

Upload an app to the App directory. By default the app is private and visible only to you.

#### Usage​
    
    
    $ npx devvit upload [--bump major|minor|patch|prerelease] [--copyPaste]  
    

#### Optional arguments​

  * `--bump <option>`

Type of version bump (major|minor|patch|prerelease)

  * `--copyPaste`

Copy-paste the auth code instead of opening a browser

### devvit version​

Get the version of the locally installed Devvit CLI.

#### Usage​
    
    
    $ npx devvit version  
    

### devvit view​

Shows you the latest version of your app and some data about uploads. Includes an optional --json flag to get information in JSON format.

#### Usage​​
    
    
    $ npx devvit view [APPSLUG[@VERSION]] [--json] [version]  
    

### devvit whoami​

Display the currently logged in Reddit user.

#### Usage​
    
    
    $ npx devvit whoami  
    

## Updating the CLI​

There are currently two ways to update the Devvit CLI, depending on how you installed it.

How do I know how I installed the CLI?

The easiest way to check how you installed the CLI is to run this command in your terminal:
    
    
    npm list -g --depth=0  
    

If you see a line that starts with `devvit@`, it means you have the CLI installed globally. If not, you likely have it installed as a dev dependency in your project - you can check this by looking for `devvit` in your project's `package.json` file under the `devDependencies` section. (If you don't see it in either place, you may not have the CLI installed at all, in which case, you can follow the [quickstart guide](/docs/quickstart) to install it.)

### 1\. If you installed the CLI as a dev dependency​

This is the recommended way to install the CLI, as it ensures that your project uses a specific version of the CLI, and makes it substantially easier to both update the CLI, and know what version of the CLI you're using.

To update the CLI, run the following command in your project directory:
    
    
    npm install --save-dev devvit@latest  
    

(Or, if you're using a different package manager, use an equivalent command to update the `devvit` package to the latest version, and save it as a development dependency. _DO NOT_ save it as a regular dependency - we don't need the CLI code uploaded with your app!)

### 2\. If you installed the CLI globally​

If you installed the CLI globally, ideally, you should uninstall the global version and install it as a dev dependency in your project instead. To do this, inside your project, run the following commands:
    
    
    npm uninstall -g devvit  
    
    
    npm install --save-dev devvit@latest  
    

If you still want to keep the CLI installed globally, you can update it by running the following command:
    
    
    npm install -g devvit@latest  
    

This will update the global version of the Devvit CLI to the latest version. However, please note that this is not recommended, as it can lead to inconsistencies between the CLI version used in your project and the global version. It's best to use the CLI as a dev dependency in your project to ensure that you're always using the same version across different environments.
