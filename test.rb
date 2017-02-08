require 'forwardable'
require 'cisco_spark'
require 'dotenv'

Dotenv.load! '.env', '.env.local'

CiscoSpark.configure do |config|
  config.api_key = ENV.fetch('ACCESS_TOKEN')
end

room = CiscoSpark::Room.fetch_all.first

require 'pry'; binding.pry
